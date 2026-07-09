import os
import shutil
import uuid
from supabase import create_client, Client
import jwt  


# ==================================================
# Paths
# ==================================================

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, "saved_images")
os.makedirs(IMAGES_DIR, exist_ok=True)


# ==================================================
# Supabase Client Setup
# ==================================================

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)
print("Supabase Client initialized successfully.")


# ==================================================
# Image Saving
# ==================================================

def save_image_to_disk(source_path: str) -> str:
    """
    Copy the uploaded image into saved_images/ with a unique filename.
    Returns the full path to the saved copy, or the original path on failure.
    """
    ext      = os.path.splitext(source_path)[1].lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest     = os.path.join(IMAGES_DIR, filename)
    try:
        shutil.copy2(source_path, dest)
        print(f"Image saved -> {dest}")
        return dest
    except Exception as e:
        print(f"Could not save image copy: {e}")
        return source_path


def save_image_bytes_to_disk(image_bytes: bytes, original_filename: str) -> str:
    """
    Write raw image bytes (from a Flask file upload) into saved_images/
    with a unique filename. Returns the full path to the saved file.

    Use this in Flask routes where you have request.files bytes, not a
    source path on disk (unlike save_image_to_disk, which copies an
    existing file).
    """
    ext      = os.path.splitext(original_filename)[1].lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest     = os.path.join(IMAGES_DIR, filename)
    try:
        with open(dest, "wb") as f:
            f.write(image_bytes)
        print(f"Image saved -> {dest}")
        return dest
    except Exception as e:
        print(f"Could not save image: {e}")
        return ""


# ==================================================
# Platform Operations  (reads from `platforms` table)
# ==================================================

def fetch_active_platforms(mode: str = None) -> list[dict]:
    """
    Return all active platforms ordered by display_order.
    If mode is given ("standard" or "influencer"), only platforms
    enabled for that mode are returned.
    """
    query = supabase.table("platforms") \
        .select("key, label, default_style, default_tone, rules, char_limit, max_hashtags, display_order") \
        .order("display_order")

    if mode == "standard":
        query = query.eq("standard_enabled", True)
    elif mode == "influencer":
        query = query.eq("influencer_enabled", True)

    response = query.execute()
    return response.data

def get_platform(platform_key: str) -> dict | None:
    """
    Return a single platform row by key, or None if not found / inactive.
    RLS ensures inactive platforms are never returned.
    """
    response = supabase.table("platforms") \
        .select("key, label, default_style, default_tone, rules, char_limit, max_hashtags") \
        .eq("key", platform_key) \
        .single() \
        .execute()
    return response.data  # None if no match


# ==================================================
# Caption History Operations
# ==================================================

def save_to_db(image_name, image_paths, platform, style, tone,
               length, emojis, hashtags, description, caption,
               language="english", context="", user_id=None):
    """Insert one caption record into caption_history."""
    supabase.table("caption_history").insert({
        "image_name":  image_name,
        "image_paths": image_paths,
        "platform":    platform,
        "style":       style,
        "tone":        tone,
        "length":      length,
        "emojis":      bool(emojis),
        "hashtags":    bool(hashtags),
        "description": description,
        "caption":     caption,
        "language":    language,
        "context":     context or None,
        "user_id":     user_id,
    }).execute()
    print("💾 Caption saved to database.")


def fetch_history(user_id: str, limit: int = 10) -> list[dict]:
    """Return the most recent `limit` records for this user, newest first."""
    response = supabase.table("caption_history") \
        .select("id, image_name, image_paths, platform, style, tone, "
                "length, emojis, hashtags, caption, created_at") \
        .eq("user_id", user_id) \
        .order("id", desc=True) \
        .limit(limit) \
        .execute()
    return response.data


def delete_record(record_id: int, user_id: str) -> bool:
    """
    Delete a caption record by ID, but only if it belongs to user_id.
    Also deletes the saved image file if it lives inside saved_images/.
    Returns True on success, False if not found or not owned by this user.
    """
    row = supabase.table("caption_history") \
        .select("image_paths, user_id") \
        .eq("id", record_id) \
        .single() \
        .execute()

    if not row.data or row.data.get("user_id") != user_id:
        return False

    for image_path in (row.data.get("image_paths") or []):
        if image_path.startswith(IMAGES_DIR) and os.path.isfile(image_path):
            try:
                os.remove(image_path)
                print(f"🗑️  Deleted image file: {image_path}")
            except Exception as e:
                print(f"⚠️  Could not delete image file: {e}")

    supabase.table("caption_history").delete().eq("id", record_id).eq("user_id", user_id).execute()
    return True


def delete_all_records(user_id: str) -> None:
    """
    Delete every record belonging to user_id and their associated image files.
    """
    rows = supabase.table("caption_history") \
        .select("id, image_paths") \
        .eq("user_id", user_id) \
        .execute()

    for row in (rows.data or []):
        for image_path in (row.get("image_paths") or []):
            if image_path.startswith(IMAGES_DIR) and os.path.isfile(image_path):
                try:
                    os.remove(image_path)
                    print(f"🗑️  Deleted image file: {image_path}")
                except Exception as e:
                    print(f"⚠️  Could not delete image file: {e}")

    supabase.table("caption_history").delete().eq("user_id", user_id).execute()
    print(f"🗑️  All caption history deleted for user {user_id}.")
# ==================================================
# Auth — JWT Verification
# ==================================================

def verify_jwt(token: str) -> dict | None:
    """
    Verify a Supabase JWT by calling the Supabase auth server.
    Returns a payload-like dict with 'sub' on success, or None on failure.
    """
    try:
        response = supabase.auth.get_user(token)
        if response and response.user:
            return {"sub": response.user.id}
        return None
    except Exception as e:
        print(f"❌ JWT verification failed: {e}")
        return None

# ==================================================
# Auth — Profile Fetching
# ==================================================

def get_profile(user_id: str) -> dict | None:
    try:
        response = supabase.table("profiles") \
            .select("id, email, is_admin, standard_uses, influencer_uses, bonus_credits") \
            .eq("id", user_id) \
            .single() \
            .execute()
        return response.data
    except Exception:
        return None

# ==================================================
# Auth — Usage Check + Increment
# ==================================================

def check_and_increment_usage(user_id: str, mode: str) -> tuple[bool, str]:
    """
    Check if the user is allowed to generate, and if so, increment
    the appropriate counter (or decrement bonus_credits).

    mode: "standard" or "influencer"

    Returns (allowed: bool, reason: str).
    reason is a human-readable message for the frontend on denial.
    """
    profile = get_profile(user_id)
    if not profile:
        return False, "User profile not found."

    # Admins bypass all limits
    if profile.get("is_admin"):
        return True, "ok"

    standard_uses   = profile.get("standard_uses", 0)
    influencer_uses = profile.get("influencer_uses", 0)
    bonus_credits   = profile.get("bonus_credits", 0)

    if mode == "standard":
        free_remaining = 3 - standard_uses
    else:
        free_remaining = 2 - influencer_uses

    if free_remaining > 0:
        # Use a free generation
        col = "standard_uses" if mode == "standard" else "influencer_uses"
        current = standard_uses if mode == "standard" else influencer_uses
        supabase.table("profiles").update({col: current + 1}) \
            .eq("id", user_id).execute()
        return True, "ok"

    elif bonus_credits > 0:
        # Use a bonus credit (pooled across both modes)
        supabase.table("profiles").update({"bonus_credits": bonus_credits - 1}) \
            .eq("id", user_id).execute()
        return True, "ok"

    else:
        return False, "Generation limit reached. Contact the creator to get more credits."