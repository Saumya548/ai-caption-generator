from io import BytesIO

from google import genai
from google.genai.errors import APIError
from PIL import Image


# ==================================================
# Gemini Client Setup
# ==================================================

try:
    gemini_client = genai.Client()
    print("Gemini Client initialized successfully.")
except Exception as e:
    print(f"Error initializing Gemini Client: {e}")
    gemini_client = None


# ==================================================
# Image Utilities
# ==================================================

def resize_image_for_gemini(image_bytes: bytes, max_size: int = 1024) -> Image.Image:
    """
    Resize image to a smaller size suitable for Gemini vision input.
    """
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    return img



# ==================================================
# Supported Languages
# ==================================================

LANGUAGES: dict[str, str] = {
    "english": "English",
    "hindi": "Hindi",
    "hinglish": "Hinglish",
    "bengali": "Bengali",
    "tamil": "Tamil",
}

LANGUAGE_KEYS: list[str] = ["english", "hindi", "hinglish", "bengali", "tamil"]


# ==================================================
# Gemini Step 1: Image -> Description (with retries)
# ==================================================

def generate_image_description(
    img: Image.Image,
    model_name: str = "gemini-2.5-flash",
    max_attempts: int = 3
) -> str:
    """
    Ask Gemini to describe the image.
    Retries up to max_attempts if the response is empty or fails.
    """
    if not gemini_client:
        raise RuntimeError("Gemini client not initialized.")

    prompt = (
        "Describe this image clearly and objectively. "
        "Mention visible objects, people, actions, environment, "
        "mood, and any notable details. Do not write a caption."
    )

    for attempt in range(1, max_attempts + 1):
        try:
            print(f"🔍 Gemini image read attempt {attempt}/{max_attempts}")
            response = gemini_client.models.generate_content(
                model=model_name,
                contents=[prompt, img]
            )
            if response.text and response.text.strip():
                return response.text.strip()

        except APIError as e:
            print(f"❌ Gemini API error on attempt {attempt}: {e}")
        except Exception as e:
            print(f"❌ Unexpected error on attempt {attempt}: {e}")

    raise RuntimeError(
        f"Failed to generate image description after {max_attempts} attempts."
    )


# ==================================================
# Gemini Step 2: Description -> Styled Caption
# ==================================================

def generate_caption_from_description(
    description: str,
    platform_rules: str,
    style: str,
    tone: str,
    length: str,
    emojis_text: str,
    hashtags_text: str,
    language: str = "english",
    context: str = "",
    model_name: str = "gemini-2.5-flash"
) -> str:
    """
    Generate a social media caption from a textual image description.
    """
    if not gemini_client:
        raise RuntimeError("Gemini client not initialized.")
    
    if context and context.strip():
        context_block = f"""
            User context:
            "{context.strip()}"

            IMPORTANT:
            - Treat the user context as supplementary information.
            - It may add personal perspective, storytelling, humour, emotion, purpose, or background.
            - It must never override or contradict facts established in the image description.
            - If the context indicates that the user created, owns, photographed, painted, designed, drew, or personally experienced what is shown, you may write from a first-person perspective.
        """
    else:
        context_block = ""

    prompt = f"""
        You are an expert social media caption writer.

        Image description (SOURCE OF TRUTH):
        {description}

        Platform context:
        {platform_rules}

        {context_block}

        Instructions:
        - Caption style: {style}
        - Caption tone: {tone}
        - Caption length: {length}
        - {emojis_text}
        - {hashtags_text}

        Requirements:
        - The image description is the source of truth.
        - Never contradict the image description.
        - Do not invent people, objects, actions, locations, or events that are not supported by the image description.
        - Use the user context only to add personal, creative, emotional, or thematic flavour.
        - If the user context suggests that the image shows something created, owned, experienced, photographed, painted, designed, drawn, or otherwise personally connected to the user, write naturally from a first-person perspective when appropriate.
        - Otherwise, write from a neutral perspective.
        - Avoid generic AI-sounding phrases and cliches.
        - Keep the caption natural, authentic, and engaging.
        - Respect all platform rules above; they take priority over generic instructions.
        - Output only the final caption and nothing else.

        Write the entire caption in {LANGUAGES.get(language, "English")} language only.
        """

    response = gemini_client.models.generate_content(
        model=model_name,
        contents=prompt
    )

    if response.text and response.text.strip():
        return response.text.strip()

    raise RuntimeError("Gemini returned an empty caption.")


# ==================================================
# Gemini Step 3: Multiple Descriptions -> 3 Caption Variants
# ==================================================

def generate_influencer_captions_from_descriptions(
    descriptions: list[str],
    platform_rules: str,
    style: str,
    tone: str,
    length: str,
    emojis_text: str,
    hashtags_text: str,
    language: str = "english",
    context: str = "",
    model_name: str = "gemini-2.5-flash"
) -> list[str]:
    """
    Generate 3 caption variants for a multi-image post from a list of
    per-image descriptions. Used by Influencer Mode.
    """
    if not gemini_client:
        raise RuntimeError("Gemini client not initialized.")

    combined_description = "\n".join(
        f"Image {i+1}: {desc}" for i, desc in enumerate(descriptions)
    )

    prompt = f"""
        You are an expert social media caption writer creating a post
        that includes multiple images together.

        Image descriptions (SOURCE OF TRUTH):
        {combined_description}

        User context (required):
        "{context.strip()}"

        Platform context:
        {platform_rules}

        Instructions:
        - Caption style: {style}
        - Caption tone: {tone}
        - Caption length: {length}
        - {emojis_text}
        - {hashtags_text}

        Requirements:
        - Treat all images as part of ONE single post, not separate posts.
        - Never contradict any of the image descriptions.
        - Do not invent people, objects, actions, locations, or events not supported by the descriptions.
        - Use the user context to shape tone, story, and personal voice.
        - Avoid generic AI-sounding phrases and cliches.
        - Respect all platform rules above; they take priority over generic instructions.

        Output EXACTLY 3 distinct caption variants for this post.
        Separate them using this exact delimiter on its own line: ---CAPTION---
        Output nothing else — no numbering, no labels, no explanations.

        Write all captions in {LANGUAGES.get(language, "English")} language only.
        """

    response = gemini_client.models.generate_content(
        model=model_name,
        contents=prompt
    )

    if response.text and response.text.strip():
        variants = [v.strip() for v in response.text.strip().split("---CAPTION---") if v.strip()]
        if variants:
            return variants

    raise RuntimeError("Gemini returned no caption variants.")