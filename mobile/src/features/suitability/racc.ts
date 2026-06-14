export interface RaccValue {
  value: number
  unit: 'g' | 'ml'
}

interface RaccEntry {
  patterns: string[]
  racc: RaccValue
  description: string
}

const RACC_TABLE: RaccEntry[] = [
  { patterns: ['beverages', 'waters', 'juices', 'soft drinks', 'sodas', 'fruit drinks', 'energy drinks', 'sports drinks', 'coffees', 'teas', 'drinks', 'beverage', 'drink'], racc: { value: 240, unit: 'ml' }, description: 'Non-dairy beverages' },
  { patterns: ['milks', 'dairy drinks', 'milk', 'yogurt drinks', 'kefir', 'buttermilk', 'chocolate milk'], racc: { value: 245, unit: 'ml' }, description: 'Dairy drinks' },
  { patterns: ['yogurts', 'yogurt', 'greek yogurt', 'drinkable yogurt'], racc: { value: 170, unit: 'g' }, description: 'Yogurt' },
  { patterns: ['ice creams', 'ice cream', 'frozen desserts', 'gelato', 'sorbet'], racc: { value: 85, unit: 'g' }, description: 'Ice cream (1/2 cup)' },
  { patterns: ['breads', 'bread', 'white bread', 'whole wheat bread', 'rye bread', 'toast', 'buns', 'rolls', 'bagels', 'croissants', 'english muffins', 'tortillas', 'pita'], racc: { value: 50, unit: 'g' }, description: 'Breads (2 oz)' },
  { patterns: ['cereals', 'breakfast cereals', 'granola', 'muesli', 'oatmeal', 'porridge', 'corn flakes'], racc: { value: 30, unit: 'g' }, description: 'Ready-to-eat cereal' },
  { patterns: ['oatmeals', 'hot cereals', 'cream of wheat', 'grits'], racc: { value: 55, unit: 'g' }, description: 'Hot cereal (prepared)' },
  { patterns: ['cookies', 'biscuits', 'shortbread', 'cookies'], racc: { value: 30, unit: 'g' }, description: 'Cookies' },
  { patterns: ['crackers', 'pretzels', 'rice cakes', 'crispbread', 'crackers'], racc: { value: 30, unit: 'g' }, description: 'Crackers' },
  { patterns: ['chips', 'crisps', 'potato chips', 'tortilla chips', 'snacks', 'popcorn', 'puffs', 'cheese puffs', 'snack mixes'], racc: { value: 30, unit: 'g' }, description: 'Snacks/chips' },
  { patterns: ['chocolates', 'candy', 'candies', 'chocolate', 'confectionery', 'gum', 'hard candy', 'gummy', 'licorice', 'marshmallows'], racc: { value: 40, unit: 'g' }, description: 'Confectionery' },
  { patterns: ['pastas', 'noodles', 'pasta', 'spaghetti', 'macaroni', 'ramen', 'rice noodles', 'soba', 'udon'], racc: { value: 140, unit: 'g' }, description: 'Pasta/noodles (prepared)' },
  { patterns: ['rices', 'rice', 'jasmine rice', 'basmati rice', 'brown rice', 'wild rice', 'risotto'], racc: { value: 140, unit: 'g' }, description: 'Rice (prepared)' },
  { patterns: ['soups', 'soup', 'broths', 'stocks', 'chowder', 'bisque'], racc: { value: 245, unit: 'g' }, description: 'Soup (1 cup)' },
  { patterns: ['sauces', 'sauce', 'pasta sauce', 'tomato sauce', 'gravy', 'dips', 'salsa', 'marinade', 'dressing', 'mayonnaise', 'ketchup', 'mustard', 'relishes', 'pickles'], racc: { value: 110, unit: 'g' }, description: 'Sauces/dressings' },
  { patterns: ['fruits', 'fresh fruits', 'fruit', 'apples', 'bananas', 'oranges', 'berries', 'grapes', 'melons', 'peaches', 'plums', 'apricots', 'nectarines', 'pears', 'mangoes', 'pineapple', 'kiwi'], racc: { value: 140, unit: 'g' }, description: 'Fresh fruit' },
  { patterns: ['dried fruits', 'dried fruit', 'raisins', 'prunes', 'dates', 'dried apricots', 'dried mango', 'dried cranberries'], racc: { value: 40, unit: 'g' }, description: 'Dried fruit' },
  { patterns: ['canned fruits', 'canned fruit', 'fruit cocktail', 'fruit in syrup', 'compote'], racc: { value: 140, unit: 'g' }, description: 'Canned fruit' },
  { patterns: ['vegetables', 'fresh vegetables', 'vegetable', 'broccoli', 'spinach', 'carrots', 'lettuce', 'tomatoes', 'cucumber', 'peppers', 'cabbage', 'cauliflower', 'kale', 'asparagus', 'green beans', 'peas', 'corn'], racc: { value: 85, unit: 'g' }, description: 'Fresh vegetables' },
  { patterns: ['canned vegetables', 'canned vegetable', 'canned corn', 'canned peas', 'canned beans'], racc: { value: 85, unit: 'g' }, description: 'Canned vegetables' },
  { patterns: ['potatoes', 'fries', 'french fries', 'hash browns', 'mashed potatoes', 'potato'], racc: { value: 85, unit: 'g' }, description: 'Potatoes' },
  { patterns: ['legumes', 'beans', 'lentils', 'chickpeas', 'kidney beans', 'black beans', 'pinto beans', 'refried beans'], racc: { value: 130, unit: 'g' }, description: 'Legumes (prepared)' },
  { patterns: ['meats', 'meat', 'beef', 'pork', 'lamb', 'veal', 'steaks', 'roasts', 'ground beef', 'ground pork'], racc: { value: 85, unit: 'g' }, description: 'Meat' },
  { patterns: ['poultry', 'chicken', 'turkey', 'duck', 'goose'], racc: { value: 85, unit: 'g' }, description: 'Poultry' },
  { patterns: ['fish', 'seafood', 'salmon', 'tuna', 'cod', 'shrimp', 'scallops', 'mussels', 'sardines'], racc: { value: 85, unit: 'g' }, description: 'Fish/seafood' },
  { patterns: ['eggs', 'egg'], racc: { value: 50, unit: 'g' }, description: 'Eggs (1 large)' },
  { patterns: ['cheeses', 'cheese', 'cheddar', 'mozzarella', 'swiss', 'parmesan', 'provolone', 'gouda', 'brie', 'camembert'], racc: { value: 30, unit: 'g' }, description: 'Cheese' },
  { patterns: ['butters', 'butter', 'margarine', 'spreads'], racc: { value: 14, unit: 'g' }, description: 'Butter (1 tbsp)' },
  { patterns: ['oils', 'oil', 'olive oil', 'vegetable oil', 'coconut oil', 'canola oil'], racc: { value: 14, unit: 'g' }, description: 'Oil (1 tbsp)' },
  { patterns: ['nut butters', 'peanut butter', 'almond butter', 'cashew butter', 'nut butter'], racc: { value: 32, unit: 'g' }, description: 'Nut butter (2 tbsp)' },
  { patterns: ['nuts', 'nut', 'almonds', 'walnuts', 'cashews', 'peanuts', 'pecans', 'macadamia', 'pistachios', 'mixed nuts'], racc: { value: 30, unit: 'g' }, description: 'Nuts (1 oz)' },
  { patterns: ['seeds', 'seed', 'sunflower seeds', 'pumpkin seeds', 'chia seeds', 'flax seeds', 'sesame seeds'], racc: { value: 30, unit: 'g' }, description: 'Seeds (1 oz)' },
  { patterns: ['sugars', 'sugar', 'honey', 'syrup', 'maple syrup', 'agave', 'molasses', 'sweeteners', 'sweetener'], racc: { value: 4, unit: 'g' }, description: 'Sugar (1 tsp)' },
  { patterns: ['jams', 'jam', 'jelly', 'marmalade', 'fruit preserves', 'honey'], racc: { value: 20, unit: 'g' }, description: 'Jam (1 tbsp)' },
  { patterns: ['cakes', 'cake', 'cupcakes', 'muffins', 'brownies', 'pastries', 'doughnuts', 'danishes'], racc: { value: 55, unit: 'g' }, description: 'Cakes/muffins' },
  { patterns: ['pies', 'pie', 'quiche', 'tarts'], racc: { value: 65, unit: 'g' }, description: 'Pie' },
  { patterns: ['pizzas', 'pizza'], racc: { value: 140, unit: 'g' }, description: 'Pizza' },
  { patterns: ['sandwiches', 'sandwich', 'wraps', 'subs', 'burgers', 'hamburgers', 'cheeseburgers', 'hot dogs'], racc: { value: 140, unit: 'g' }, description: 'Sandwiches/burgers' },
  { patterns: ['frozen meals', 'frozen entrees', 'tv dinners', 'microwave meals', 'ready meals', 'ready-made meals'], racc: { value: 200, unit: 'g' }, description: 'Frozen entrees' },
  { patterns: ['rice cakes', 'rice cake', 'crispy rice'], racc: { value: 30, unit: 'g' }, description: 'Rice cakes' },
  { patterns: ['tofu', 'tempeh', 'meat alternatives', 'veggie burgers', 'seitan'], racc: { value: 85, unit: 'g' }, description: 'Meat alternatives' },
  { patterns: ['baby foods', 'baby food', 'infant formula', 'baby snacks'], racc: { value: 60, unit: 'g' }, description: 'Baby food' },
  { patterns: ['protein bars', 'energy bars', 'granola bars', 'snack bars', 'nutrition bars', 'breakfast bars'], racc: { value: 40, unit: 'g' }, description: 'Snack bars' },
  { patterns: ['frozen vegetables', 'frozen vegetable', 'frozen broccoli', 'frozen spinach', 'frozen peas'], racc: { value: 85, unit: 'g' }, description: 'Frozen vegetables' },
  { patterns: ['frozen fruits', 'frozen fruit', 'frozen berries'], racc: { value: 140, unit: 'g' }, description: 'Frozen fruit' },
  { patterns: ['creams', 'cream', 'heavy cream', 'whipped cream', 'half and half', 'sour cream'], racc: { value: 30, unit: 'g' }, description: 'Cream (2 tbsp)' },
  { patterns: ['coconut milk', 'evaporated milk', 'condensed milk'], racc: { value: 30, unit: 'ml' }, description: 'Canned milk' },
  { patterns: ['vinegars', 'vinegar', 'cooking wine', 'mirin', 'rice vinegar', 'balsamic', 'apple cider vinegar'], racc: { value: 15, unit: 'ml' }, description: 'Vinegar (1 tbsp)' },
  { patterns: ['stock cubes', 'bouillon', 'broth cubes', 'seasoning mixes', 'gravy granules'], racc: { value: 4, unit: 'g' }, description: 'Stock cubes (1 tsp)' },
  { patterns: ['sprinkles', 'decorations', 'baking decorations', 'food coloring'], racc: { value: 4, unit: 'g' }, description: 'Baking decorations' },
  { patterns: ['yeasts', 'yeast', 'baking powder', 'baking soda', 'cream of tartar'], racc: { value: 4, unit: 'g' }, description: 'Leavening agents' },
  { patterns: ['gelatins', 'gelatin', 'jello', 'pudding mixes', 'custard mixes'], racc: { value: 10, unit: 'g' }, description: 'Gelatin/pudding (dry)' },
]

export function getRacc(categories: string[]): RaccValue {
  if (!categories.length) return { value: 100, unit: 'g' }

  const lowerCats = categories.map((c) => c.toLowerCase())

  for (const entry of RACC_TABLE) {
    for (const pattern of entry.patterns) {
      for (const cat of lowerCats) {
        if (cat.includes(pattern)) {
          return entry.racc
        }
      }
    }
  }

  return { value: 100, unit: 'g' }
}

export function getRaccCategoryName(categories: string[]): string {
  if (!categories.length) return 'General food'

  const lowerCats = categories.map((c) => c.toLowerCase())

  for (const entry of RACC_TABLE) {
    for (const pattern of entry.patterns) {
      for (const cat of lowerCats) {
        if (cat.includes(pattern)) {
          return entry.description
        }
      }
    }
  }

  return 'General food'
}
