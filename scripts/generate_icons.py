from PIL import Image, ImageDraw


def generate_icon(size, path):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = max(1, size // 64)

    # Dark background circle
    draw.ellipse([margin, margin, size - margin, size - margin], fill=(26, 26, 26, 255))

    # Amber circle for crescent base
    r = int(size * 0.35)
    cx, cy = size // 2, size // 2
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(240, 165, 0, 255))

    # Dark cutout circle to form crescent
    offset = int(size * 0.12)
    draw.ellipse(
        [cx - r + offset, cy - r - offset, cx + r + offset, cy + r - offset],
        fill=(26, 26, 26, 255),
    )

    img.save(path)


generate_icon(16, "icons/icon16.png")
generate_icon(48, "icons/icon48.png")
generate_icon(128, "icons/icon128.png")

print("Icons generated successfully.")
