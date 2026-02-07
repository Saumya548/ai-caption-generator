import os
from flask import Flask, request, jsonify, render_template
from google import genai
from google.genai.errors import APIError
from PIL import Image
from io import BytesIO

# --- Flask Setup ---
app = Flask(__name__)

# --- Gemini Client Setup ---
try:
    gemini_client = genai.Client()
    print("✅ Gemini Client initialized successfully.")
except Exception as e:
    print(f"❌ Error initializing Gemini Client: {e}")
    gemini_client = None

# --------------------------------------------------
# Image Utilities
# --------------------------------------------------

def resize_image_for_gemini(
    image_bytes: bytes,
    max_size: int = 1024
) -> Image.Image:
    """
    Resize a high-quality image to a smaller but readable size
    suitable for Gemini vision input.
    """
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    return img

# --------------------------------------------------
# Gemini Step 1: Image → Generic Description (with retries)
# --------------------------------------------------

def generate_image_description(
    img: Image.Image,
    model_name: str = "gemini-2.5-flash",
    max_attempts: int = 3
) -> str:
    """
    Ask Gemini to describe the image.
    Retries up to max_attempts if response is empty or fails.
    """
    if not gemini_client:
        raise RuntimeError("Gemini client not initialized.")

    prompt = (
        "Describe this image clearly and objectively. "
        "Mention visible objects, people, actions, environment, "
        "mood, and any notable details. Do not write a caption."
    )

    last_error = None

    for attempt in range(1, max_attempts + 1):
        try:
            print(f"🖼️ Gemini image read attempt {attempt}/{max_attempts}")

            response = gemini_client.models.generate_content(
                model=model_name,
                contents=[prompt, img]
            )

            if response.text and response.text.strip():
                return response.text.strip()

        except APIError as e:
            print(f"❌ Gemini API error on attempt {attempt}: {e}")
            last_error = e
        except Exception as e:
            print(f"❌ Unexpected error on attempt {attempt}: {e}")
            last_error = e

    raise RuntimeError(
        f"Failed to generate image description after {max_attempts} attempts."
    )

# --------------------------------------------------
# Gemini Step 2: Description → Styled Caption
# --------------------------------------------------

def generate_caption_from_description(
    description: str,
    style: str,
    length: str,
    emojis_text: str,
    hashtags_text: str,
    model_name: str = "gemini-2.5-flash"
) -> str:
    """
    Generate a social media caption using a textual image description.
    """
    if not gemini_client:
        raise RuntimeError("Gemini client not initialized.")

    prompt = f"""
You are a social media caption writer.

Image description:
{description}

Instructions:
- Caption style: {style}
- Caption length: {length}
- {emojis_text}
- {hashtags_text}

Write a natural, engaging caption based strictly on the description.
"""

    response = gemini_client.models.generate_content(
        model=model_name,
        contents=prompt
    )

    if response.text and response.text.strip():
        return response.text.strip()

    raise RuntimeError("Gemini returned an empty caption.")


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

    # 2. UI Options
    style = request.form.get('style', 'creative')
    length = request.form.get('length', 'medium')
    emojis = request.form.get('emojis', 'false')
    hashtags = request.form.get('hashtags', 'false')

    emojis_text = "Include emojis." if emojis == "true" else "Do not include emojis."
    hashtags_text = "Include relevant hashtags." if hashtags == "true" else "Do not include hashtags."

    try:
        # 3. Resize image
        resized_img = resize_image_for_gemini(image_bytes)

        # 4. Gemini pass #1 — image → description (with retries)
        description = generate_image_description(resized_img)

        # 5. Gemini pass #2 — description → caption
        caption = generate_caption_from_description(
            description=description,
            style=style,
            length=length,
            emojis_text=emojis_text,
            hashtags_text=hashtags_text
        )

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
# Run Server
# --------------------------------------------------

if __name__ == '__main__':
    if not os.getenv("GEMINI_API_KEY"):
        print("\n🛑 WARNING: GEMINI_API_KEY environment variable not set.\n")

    app.run(debug=True)
