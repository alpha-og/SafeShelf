import json
import os

# Expanded dataset of FDA Nutrition Information for Raw Fruits, Vegetables, and Seafood
DATA = [
    # FRUITS
    {"name": "Apple", "cal": 52, "carb": 14, "sugar": 10, "fiber": 2.4, "pro": 0.3, "fat": 0.2, "na": 1},
    {"name": "Avocado", "cal": 160, "carb": 9, "sugar": 1, "fiber": 7, "pro": 2, "fat": 15, "na": 7},
    {"name": "Banana", "cal": 89, "carb": 23, "sugar": 12, "fiber": 2.6, "pro": 1.1, "fat": 0.3, "na": 1},
    {"name": "Cantaloupe", "cal": 34, "carb": 8, "sugar": 8, "fiber": 0.9, "pro": 0.8, "fat": 0.2, "na": 16},
    {"name": "Grapefruit", "cal": 42, "carb": 11, "sugar": 7, "fiber": 1.6, "pro": 0.8, "fat": 0.1, "na": 0},
    {"name": "Grapes", "cal": 69, "carb": 18, "sugar": 15, "fiber": 0.9, "pro": 0.7, "fat": 0.2, "na": 2},
    {"name": "Honeydew Melon", "cal": 36, "carb": 9, "sugar": 8, "fiber": 0.8, "pro": 0.5, "fat": 0.1, "na": 18},
    {"name": "Kiwifruit", "cal": 61, "carb": 15, "sugar": 9, "fiber": 3.0, "pro": 1.1, "fat": 0.5, "na": 3},
    {"name": "Lemon", "cal": 29, "carb": 9, "sugar": 2.5, "fiber": 2.8, "pro": 1.1, "fat": 0.3, "na": 2},
    {"name": "Lime", "cal": 30, "carb": 11, "sugar": 1.7, "fiber": 2.8, "pro": 0.7, "fat": 0.2, "na": 2},
    {"name": "Nectarine", "cal": 44, "carb": 11, "sugar": 8, "fiber": 1.7, "pro": 1.1, "fat": 0.3, "na": 0},
    {"name": "Orange", "cal": 47, "carb": 12, "sugar": 9, "fiber": 2.4, "pro": 0.9, "fat": 0.1, "na": 0},
    {"name": "Peach", "cal": 39, "carb": 10, "sugar": 8, "fiber": 1.5, "pro": 0.9, "fat": 0.3, "na": 0},
    {"name": "Pear", "cal": 57, "carb": 15, "sugar": 10, "fiber": 3.1, "pro": 0.4, "fat": 0.1, "na": 1},
    {"name": "Pineapple", "cal": 50, "carb": 13, "sugar": 10, "fiber": 1.4, "pro": 0.5, "fat": 0.1, "na": 1},
    {"name": "Plums", "cal": 46, "carb": 11, "sugar": 10, "fiber": 1.4, "pro": 0.7, "fat": 0.3, "na": 0},
    {"name": "Strawberries", "cal": 32, "carb": 8, "sugar": 5, "fiber": 2.0, "pro": 0.7, "fat": 0.3, "na": 1},
    {"name": "Sweet Cherries", "cal": 63, "carb": 16, "sugar": 13, "fiber": 2.1, "pro": 1.1, "fat": 0.2, "na": 0},
    {"name": "Tangerine", "cal": 53, "carb": 13, "sugar": 11, "fiber": 1.8, "pro": 0.8, "fat": 0.3, "na": 2},
    {"name": "Watermelon", "cal": 30, "carb": 8, "sugar": 6, "fiber": 0.4, "pro": 0.6, "fat": 0.2, "na": 1},
    
    # VEGETABLES
    {"name": "Asparagus", "cal": 20, "carb": 4, "sugar": 1.9, "fiber": 2.1, "pro": 2.2, "fat": 0.1, "na": 2},
    {"name": "Bell Pepper", "cal": 20, "carb": 5, "sugar": 2.4, "fiber": 1.7, "pro": 0.9, "fat": 0.2, "na": 3},
    {"name": "Broccoli", "cal": 34, "carb": 7, "sugar": 1.7, "fiber": 2.6, "pro": 2.8, "fat": 0.4, "na": 33},
    {"name": "Carrot", "cal": 41, "carb": 10, "sugar": 4.7, "fiber": 2.8, "pro": 0.9, "fat": 0.2, "na": 69},
    {"name": "Cauliflower", "cal": 25, "carb": 5, "sugar": 1.9, "fiber": 2.0, "pro": 1.9, "fat": 0.3, "na": 30},
    {"name": "Celery", "cal": 16, "carb": 3, "sugar": 1.3, "fiber": 1.6, "pro": 0.7, "fat": 0.2, "na": 80},
    {"name": "Cucumber", "cal": 15, "carb": 4, "sugar": 1.7, "fiber": 0.5, "pro": 0.7, "fat": 0.1, "na": 2},
    {"name": "Green Beans", "cal": 31, "carb": 7, "sugar": 3.3, "fiber": 2.7, "pro": 1.8, "fat": 0.2, "na": 6},
    {"name": "Cabbage", "cal": 25, "carb": 6, "sugar": 3.2, "fiber": 2.5, "pro": 1.3, "fat": 0.1, "na": 18},
    {"name": "Iceberg Lettuce", "cal": 14, "carb": 3, "sugar": 2.0, "fiber": 1.2, "pro": 0.9, "fat": 0.1, "na": 10},
    {"name": "Mushrooms", "cal": 22, "carb": 3, "sugar": 2.0, "fiber": 1.0, "pro": 3.1, "fat": 0.3, "na": 5},
    {"name": "Onion", "cal": 40, "carb": 9, "sugar": 4.2, "fiber": 1.7, "pro": 1.1, "fat": 0.1, "na": 4},
    {"name": "Potato", "cal": 77, "carb": 17, "sugar": 0.8, "fiber": 2.2, "pro": 2.0, "fat": 0.1, "na": 6},
    {"name": "Radish", "cal": 16, "carb": 3, "sugar": 1.9, "fiber": 1.6, "pro": 0.7, "fat": 0.1, "na": 39},
    {"name": "Spinach", "cal": 23, "carb": 4, "sugar": 0.4, "fiber": 2.2, "pro": 2.9, "fat": 0.4, "na": 79},
    {"name": "Sweet Potato", "cal": 86, "carb": 20, "sugar": 4.2, "fiber": 3.0, "pro": 1.6, "fat": 0.1, "na": 55},
    {"name": "Tomato", "cal": 18, "carb": 4, "sugar": 2.6, "fiber": 1.2, "pro": 0.9, "fat": 0.2, "na": 5},
    
    # SEAFOOD (Cooked, per 100g)
    {"name": "Salmon (Atlantic)", "cal": 206, "carb": 0, "sugar": 0, "fiber": 0, "pro": 22, "fat": 12, "na": 61},
    {"name": "Shrimp", "cal": 99, "carb": 0.2, "sugar": 0, "fiber": 0, "pro": 24, "fat": 0.3, "na": 111},
    {"name": "Tuna (Yellowfin)", "cal": 109, "carb": 0, "sugar": 0, "fiber": 0, "pro": 24, "fat": 0.5, "na": 45},
    {"name": "Cod", "cal": 82, "carb": 0, "sugar": 0, "fiber": 0, "pro": 18, "fat": 0.7, "na": 54},
    {"name": "Tilapia", "cal": 96, "carb": 0, "sugar": 0, "fiber": 0, "pro": 20, "fat": 1.7, "na": 52},
    {"name": "Crab (Blue)", "cal": 83, "carb": 0, "sugar": 0, "fiber": 0, "pro": 18, "fat": 1.0, "na": 293},
    {"name": "Oysters", "cal": 68, "carb": 4, "sugar": 0.5, "fiber": 0, "pro": 7, "fat": 2.5, "na": 211},
]

def generate_json():
    result = []
    for i, item in enumerate(DATA):
        cat = "Seafood"
        if item["name"] in ["Apple", "Avocado", "Banana", "Cantaloupe", "Grapefruit", "Grapes", "Honeydew Melon", "Kiwifruit", "Lemon", "Lime", "Nectarine", "Orange", "Peach", "Pear", "Pineapple", "Plums", "Strawberries", "Sweet Cherries", "Tangerine", "Watermelon"]:
            cat = "Fruits"
        elif item["name"] in ["Asparagus", "Bell Pepper", "Broccoli", "Carrot", "Cauliflower", "Celery", "Cucumber", "Green Beans", "Cabbage", "Iceberg Lettuce", "Mushrooms", "Onion", "Potato", "Radish", "Spinach", "Sweet Potato", "Tomato"]:
            cat = "Vegetables"
        
        barcode_id = f"PROD-{item['name'].upper().replace(' ', '-')}-{str(i).zfill(2)}"
        
        # Determine image URL based on category
        img_url = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80" # Default produce
        if cat == "Fruits":
            img_url = "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&q=80"
        elif cat == "Seafood":
            img_url = "https://images.unsplash.com/photo-1615141982883-c7da0e69f10c?w=500&q=80"
            
        result.append({
            "barcode": barcode_id,
            "product_name": f"Fresh {item['name']}",
            "category": cat,
            "image_url": img_url,
            "quantity": "500 g" if cat != "Seafood" else "250 g",
            "brand": "Fresh Farm Produce",
            "nutrients": {
                "energy-kcal_100g": item["cal"],
                "carbohydrates_100g": item["carb"],
                "sugars_100g": item["sugar"],
                "fiber_100g": item["fiber"],
                "proteins_100g": item["pro"],
                "fat_100g": item["fat"],
                "sodium_100g": item["na"] / 1000.0 # mg to g
            }
        })
        
    os.makedirs('data', exist_ok=True)
    with open('data/fresh_produce.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)

if __name__ == '__main__':
    generate_json()
    print("fresh_produce.json successfully generated with FDA dataset!")
