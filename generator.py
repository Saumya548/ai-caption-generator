import os
from flask import Flask, request, jsonify, render_template
from gem import (
    generate_caption_from_description,
    generate_influencer_captions_from_descriptions, 
    generate_image_description,
    resize_image_for_gemini,
)
from database import (
    save_image_bytes_to_disk,
    save_to_db,
    fetch_history,
    delete_record,
    delete_all_records,
    get_platform,
    verify_jwt,
    get_profile,
    check_and_increment_usage, 
    fetch_active_platforms,           
)

# --- Flask Setup ---
app = Flask(__name__)

def get_verified_user(request) -> tuple[dict | None, tuple | None]:
    """
    Extract and verify the JWT from the Authorization header.
    Returns (payload, None) on success, or (None, error_response) on failure.
    Call as: payload, err = get_verified_user(request); if err: return err
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, (jsonify({"error": "Login required."}), 401)

    token = auth_header.split(" ", 1)[1]
    payload = verify_jwt(token)
    if not payload:
        return None, (jsonify({"error": "Session expired. Please sign in again."}), 401)

    return payload, None

# --------------------------------------------------
# Flask API Endpoint
# --------------------------------------------------
 
@app.route('/generate-caption', methods=['POST'])
def generate_caption_endpoint():
 
    # 1. Validate upload
    if 'image_file' not in request.files:
        return jsonify({"caption": "No image file provided."}), 400
 
    image_file = request.files['image_file']
 
    if image_file.filename == '':
        return jsonify({"caption": "No selected file."}), 400
 
    try:
        image_bytes = image_file.read()
    except Exception as e:
        return jsonify({"caption": f"Error reading image file: {e}"}), 500
    
    # Auth check
    payload, err = get_verified_user(request)
    if err:
        return err

    user_id = payload.get("sub")
    allowed, reason = check_and_increment_usage(user_id, "standard")
    if not allowed:
        return jsonify({"error": reason, "limit_reached": True}), 403
 
    # 2. UI Options
    style    = request.form.get('style', 'creative')
    tone     = request.form.get('tone', 'happy')
    length   = request.form.get('length', 'medium')
    language = request.form.get('language', 'english')
    emojis   = request.form.get('emojis', 'false')
    hashtags = request.form.get('hashtags', 'false')
    context  = request.form.get('context', '')
    platform = request.form.get('platform', 'instagram').lower()
 
    # Legacy fallbacks (platform guidelines now govern these)
    emojis_text   = "Include emojis." if emojis == "true" else "Do not include emojis."
    hashtags_text = "Include relevant hashtags." if hashtags == "true" else "Do not include hashtags."
 
    try:
        # 3. Resize image
        resized_img = resize_image_for_gemini(image_bytes)

        # 4. Gemini pass #1 — image → description (with retries)
        description = generate_image_description(resized_img)

        platform_data  = get_platform(platform)
        platform_rules = platform_data["rules"] if platform_data else "Write a compelling social media caption."

        # 5. Gemini pass #2 — description → caption (platform-aware)
        caption = generate_caption_from_description(
            description=description,
            platform_rules=platform_rules,
            style=style,
            tone=tone,
            length=length,
            emojis_text=emojis_text,
            hashtags_text=hashtags_text,
            language=language,
            context=context
        )

        # 6. Persist image and caption to disk + DB (best-effort)
        try:
            saved_path = save_image_bytes_to_disk(image_bytes, image_file.filename or "upload.jpg")
            save_to_db(
                image_name=image_file.filename or os.path.basename(saved_path),
                image_paths=[saved_path],                
                platform=platform,
                style=style,
                tone=tone,
                length=length,
                emojis=(emojis == 'true'),
                hashtags=(hashtags == 'true'),
                description=description,
                caption=caption,
                language=language,
                context=context,
                user_id=user_id,
            )
        except Exception as db_err:
            print(f"⚠️  Could not persist caption/image: {db_err}")

        return jsonify({"caption": caption})

    except Exception as e:
        print(f"❌ Caption generation failed: {e}")
        return jsonify({"caption": f"Error generating caption: {e}"}), 500


# --------------------------------------------------
# Page Route
# --------------------------------------------------

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')


# --------------------------------------------------
# Platforms Endpoint
# --------------------------------------------------

@app.route('/platforms', methods=['GET'])
def platforms_get():
    mode = request.args.get('mode')
    try:
        platforms = fetch_active_platforms(mode)
        return jsonify({"platforms": platforms})
    except Exception as e:
        print(f"❌ Failed to fetch platforms: {e}")
        return jsonify({"platforms": [], "error": str(e)}), 500
    

# --------------------------------------------------
# Serve saved images
# --------------------------------------------------

from flask import send_from_directory
from database import IMAGES_DIR

@app.route('/saved_images/<path:filename>', methods=['GET'])
def serve_saved_image(filename):
    return send_from_directory(IMAGES_DIR, filename)


# --------------------------------------------------
# Influencer multi-image caption endpoint
# --------------------------------------------------


@app.route('/generate-influencer-captions', methods=['POST'])
def generate_influencer_captions_endpoint():
    files = request.files.getlist('image_files')
    platform = request.form.get('platform', 'instagram').lower()
    style = request.form.get('style', 'creative')
    tone = request.form.get('tone', 'happy')
    length = request.form.get('length', 'medium')
    language = request.form.get('language', 'english')
    emojis = request.form.get('emojis', 'false')
    hashtags = request.form.get('hashtags', 'false')
    context = request.form.get('context', '')

    if not files:
        return jsonify({"captions": [], "error": "No image files provided."}), 400

    # Auth check
    payload, err = get_verified_user(request)
    if err:
        return err

    user_id = payload.get("sub")
    allowed, reason = check_and_increment_usage(user_id, "influencer")
    if not allowed:
        return jsonify({"captions": [], "error": reason, "limit_reached": True}), 403

    platform_data  = get_platform(platform)
    platform_rules = platform_data["rules"] if platform_data else "Write a compelling social media caption."

    descriptions = []
    saved_paths  = []
    for f in files:
        try:
            img_bytes = f.read()
            resized = resize_image_for_gemini(img_bytes)
            description = generate_image_description(resized)
            descriptions.append(description)
            saved_paths.append(save_image_bytes_to_disk(img_bytes, f.filename or "upload.jpg"))
        except Exception as e:
            print(f"❌ Error processing influencer image '{getattr(f, 'filename', '')}': {e}")

    if not descriptions:
        return jsonify({"captions": [], "error": "Could not process any of the uploaded images."}), 500

    try:
        captions = generate_influencer_captions_from_descriptions(
            descriptions=descriptions,
            platform_rules=platform_rules,
            style=style,
            tone=tone,
            length=length,
            emojis_text=("Include emojis." if emojis == "true" else "Do not include emojis."),
            hashtags_text=("Include relevant hashtags." if hashtags == "true" else "Do not include hashtags."),
            language=language,
            context=context,
        )
    except Exception as e:
        print(f"❌ Influencer caption generation failed: {e}")
        return jsonify({"captions": [], "error": str(e)}), 500

    # Persist one history record for the whole post, referencing all image paths
    try:
        first_name = files[0].filename if files else "upload.jpg"
        save_to_db(
            image_name=first_name,
            image_paths=saved_paths,
            platform=platform,
            style=style,
            tone=tone,
            length=length,
            emojis=(emojis == 'true'),
            hashtags=(hashtags == 'true'),
            description=" | ".join(descriptions),
            caption=captions[0],
            language=language,
            context=context,
            user_id=user_id
        )
    except Exception as perr:
        print(f"⚠️  Could not persist influencer captions: {perr}")

    return jsonify({"captions": captions})

# --------------------------------------------------
# History endpoints
# --------------------------------------------------


@app.route('/history', methods=['GET'])
def history_get():
    payload, err = get_verified_user(request)
    if err:
        return err
    try:
        items = fetch_history(payload.get("sub"))
        return jsonify({"history": items})
    except Exception as e:
        print(f"❌ Failed to fetch history: {e}")
        return jsonify({"history": [], "error": str(e)}), 500


@app.route('/history', methods=['DELETE'])
def history_delete_all():
    payload, err = get_verified_user(request)
    if err:
        return err
    try:
        delete_all_records(payload.get("sub"))
        return jsonify({"deleted": True})
    except Exception as e:
        print(f"❌ Failed to delete all history: {e}")
        return jsonify({"deleted": False, "error": str(e)}), 500


@app.route('/history/<int:record_id>', methods=['DELETE'])
def history_delete_one(record_id: int):
    payload, err = get_verified_user(request)
    if err:
        return err
    try:
        ok = delete_record(record_id, payload.get("sub"))
        return jsonify({"deleted": bool(ok)})
    except Exception as e:
        print(f"❌ Failed to delete record {record_id}: {e}")
        return jsonify({"deleted": False, "error": str(e)}), 500


# --------------------------------------------------
# Profile endpoint
# --------------------------------------------------

@app.route('/profile', methods=['GET'])
def profile_get():
    payload, err = get_verified_user(request)
    if err:
        return err
    profile = get_profile(payload.get("sub"))
    if not profile:
        return jsonify({"error": "Profile not found."}), 404
    return jsonify({"profile": profile})

# --------------------------------------------------
# Run Server
# --------------------------------------------------

if __name__ == '__main__':
    if not os.getenv("GEMINI_API_KEY"):
        print("\n🛑 WARNING: GEMINI_API_KEY environment variable not set.\n")

    app.run(debug=True)
