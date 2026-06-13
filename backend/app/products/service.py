import httpx
from fastapi import HTTPException, status

from app.products.schemas import IdentifyRequest


async def get_product_by_barcode(barcode: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json")
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Product not found")
        data = response.json()
        if data.get("status") != 1:
            raise HTTPException(status_code=404, detail="Product not found")
            
        product = data.get("product", {})
        
        def clean_tags(tags):
            if not isinstance(tags, list):
                return []
            return [t.split(":")[-1].replace("-", " ").title() if ":" in t else t for t in tags]

        ingredients = product.get("ingredients")
        if isinstance(ingredients, list):
            ingredients_list = [i.get("text", "") for i in ingredients if "text" in i]
        else:
            ingredients_text = product.get("ingredients_text", "")
            ingredients_list = [i.strip() for i in ingredients_text.split(",")] if ingredients_text else []

        return {
            "barcode": barcode,
            "product_name": product.get("product_name"),
            "brand": product.get("brands"),
            "categories": clean_tags(product.get("categories_tags", [])),
            "ingredients": ingredients_list,
            "nutrients": product.get("nutriments", {}),
            "allergens": clean_tags(product.get("allergens_tags", [])),
            "image_url": product.get("image_front_url") or product.get("image_url")
        }


async def search_products(q: str) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")


import base64
import io
import zxingcpp
from PIL import Image

async def identify_product(req: IdentifyRequest) -> dict:
    if not req.image:
        raise HTTPException(status_code=400, detail="Image is required for identification")

    base64_img = req.image
    if "," in req.image:
        base64_img = req.image.split(",")[1]

    try:
        img_data = base64.b64decode(base64_img)
        img = Image.open(io.BytesIO(img_data))
        
        mode = req.text or "auto"
        barcode = None

        if mode in ["auto", "barcode"]:
            # Convert to RGB to ensure ImageOps padding works correctly (avoids RGBA alpha issues)
            img = img.convert('RGB')
            print(f"[identify] Image size: {img.size}, mode: {img.mode}")
            
            # Upscale small images — zxing needs decent resolution to decode barcodes
            min_width = 800
            if img.width < min_width:
                scale = min_width / img.width
                new_size = (int(img.width * scale), int(img.height * scale))
                img = img.resize(new_size, Image.LANCZOS)
                print(f"[identify] Upscaled to: {img.size}")
            
            # Barcode scanners often fail if there's no white quiet zone around the barcode.
            from PIL import ImageOps, ImageFilter, ImageEnhance
            padded_img = ImageOps.expand(img, border=50, fill='white')
            
            # Try 1: padded color image
            results = zxingcpp.read_barcodes(padded_img)
            print(f"[identify] zxingcpp padded results: {results}")
            
            if not results:
                # Try 2: grayscale + sharpened
                gray = img.convert('L')
                sharpened = gray.filter(ImageFilter.SHARPEN)
                padded_gray = ImageOps.expand(sharpened, border=50, fill=255)
                results = zxingcpp.read_barcodes(padded_gray)
                print(f"[identify] zxingcpp grayscale results: {results}")

            if not results:
                # Try 3: high contrast
                gray = img.convert('L')
                enhanced = ImageEnhance.Contrast(gray).enhance(2.0)
                padded_enhanced = ImageOps.expand(enhanced, border=50, fill=255)
                results = zxingcpp.read_barcodes(padded_enhanced)
                print(f"[identify] zxingcpp high-contrast results: {results}")

            if results:
                barcode = results[0].text
                print(f"[identify] Barcode found: {barcode}")

        if barcode:
            # We found a barcode! Remove non-digits if needed, but let's just use it directly
            clean_barcode = "".join(filter(str.isdigit, barcode))
            if not clean_barcode:
                clean_barcode = barcode

            try:
                product_data = await get_product_by_barcode(clean_barcode)
                return {
                    "barcode": clean_barcode,
                    "product": product_data,
                    "confidence": 0.95,
                }
            except HTTPException as e:
                if e.status_code == 404:
                    raise HTTPException(status_code=404, detail=f"Barcode {clean_barcode} detected, but product not found in OpenFoodFacts.")
                raise e
            except Exception as e:
                print(f"OpenFoodFacts fetch failed for barcode {clean_barcode}: {e}")
                raise HTTPException(status_code=500, detail="Failed to fetch product from OpenFoodFacts")
        
        if mode == "image":
            # Image mode without OpenAI key - we can't reliably identify products visually.
            raise HTTPException(status_code=400, detail="Image mode requires an AI implementation which is currently disabled.")

        # If we reach here, no barcode was detected
        raise HTTPException(status_code=400, detail="No readable barcode found in the image")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Image decode error: {e}")
        raise HTTPException(status_code=400, detail="Invalid image or failed to decode")
