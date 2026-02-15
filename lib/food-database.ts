// Food database with calories per 100g
export const FOOD_DATABASE: { [key: string]: number } = {
  // Staples
  'rice': 130,
  'white rice': 130,
  'brown rice': 112,
  'roti': 297,
  'chapati': 297,
  'paratha': 320,
  'naan': 262,
  'bread': 265,
  'white bread': 265,
  'brown bread': 247,
  
  // Dal & Lentils
  'dal': 116,
  'moong dal': 347,
  'toor dal': 335,
  'masoor dal': 116,
  'chana dal': 364,
  'rajma': 333,
  'chole': 364,
  'chickpeas': 164,
  
  // Vegetables
  'potato': 77,
  'aloo': 77,
  'tomato': 18,
  'onion': 40,
  'carrot': 41,
  'peas': 81,
  'paneer': 265,
  'spinach': 23,
  'palak': 23,
  'cauliflower': 25,
  'gobi': 25,
  'brinjal': 25,
  'baingan': 25,
  'bhindi': 33,
  'okra': 33,
  
  // Meat & Eggs
  'chicken': 239,
  'chicken breast': 165,
  'egg': 155,
  'boiled egg': 155,
  'omelette': 154,
  'fish': 206,
  'mutton': 294,
  'beef': 250,
  
  // Dairy
  'milk': 42,
  'curd': 60,
  'yogurt': 60,
  'dahi': 60,
  'cheese': 402,
  'butter': 717,
  'ghee': 900,
  
  // Snacks
  'samosa': 262,
  'pakora': 250,
  'vada': 200,
  'idli': 132,
  'dosa': 168,
  'poha': 76,
  'upma': 98,
  'maggi': 325,
  'noodles': 138,
  'pasta': 131,
  'pizza': 266,
  'burger': 295,
  'sandwich': 265,
  'chips': 536,
  'biscuit': 502,
  'cookies': 502,
  
  // Sweets
  'chocolate': 546,
  'ice cream': 207,
  'gulab jamun': 375,
  'jalebi': 150,
  'rasgulla': 186,
  'ladoo': 450,
  'barfi': 450,
  'halwa': 387,
  'cake': 257,
  
  // Fruits
  'apple': 52,
  'banana': 89,
  'kela': 89,
  'orange': 47,
  'mango': 60,
  'aam': 60,
  'grapes': 69,
  'watermelon': 30,
  'papaya': 43,
  'guava': 68,
  
  // Drinks
  'tea': 1,
  'chai': 30,
  'coffee': 1,
  'juice': 45,
  'cola': 41,
  'coke': 41,
  'pepsi': 41,
  'nimbu pani': 40,
  'lemonade': 40,
  'lassi': 60,
  
  // Fast Food
  'biryani': 200,
  'pulao': 130,
  'fried rice': 163,
  'chowmein': 198,
  'momos': 150,
  'french fries': 312,
  'pav bhaji': 150,
  'vada pav': 286,
};

// Common portion sizes in grams
const PORTIONS: { [key: string]: number } = {
  'small': 50,
  'medium': 100,
  'large': 150,
  'plate': 200,
  'bowl': 250,
  'cup': 150,
  'glass': 200,
  'piece': 50,
  'slice': 30,
  'serving': 100,
};

export function estimateCalories(foodItem: string): { food: string; calories: number; confidence: 'high' | 'medium' | 'low' } {
  const input = foodItem.toLowerCase().trim();
  
  // Extract portion size
  let portion = 100; // default
  let foodName = input;
  
  for (const [size, grams] of Object.entries(PORTIONS)) {
    if (input.includes(size)) {
      portion = grams;
      foodName = input.replace(size, '').trim();
      break;
    }
  }
  
  // Check if number is specified (e.g., "2 rotis")
  const numberMatch = input.match(/^(\d+)\s+/);
  if (numberMatch) {
    const count = parseInt(numberMatch[1]);
    foodName = input.replace(numberMatch[0], '').trim();
    
    // Check for plural and get singular
    if (foodName.endsWith('s')) {
      const singular = foodName.slice(0, -1);
      if (FOOD_DATABASE[singular]) {
        const caloriesPer = FOOD_DATABASE[singular];
        return {
          food: `${count} ${foodName}`,
          calories: Math.round(caloriesPer * count * 0.5), // Assume 50g per piece
          confidence: 'high'
        };
      }
    }
  }
  
  // Direct match
  if (FOOD_DATABASE[foodName]) {
    return {
      food: foodItem,
      calories: Math.round(FOOD_DATABASE[foodName] * (portion / 100)),
      confidence: 'high'
    };
  }
  
  // Partial match
  for (const [key, calories] of Object.entries(FOOD_DATABASE)) {
    if (foodName.includes(key) || key.includes(foodName)) {
      return {
        food: foodItem,
        calories: Math.round(calories * (portion / 100)),
        confidence: 'medium'
      };
    }
  }
  
  // No match - estimate based on meal type
  if (foodName.includes('meal') || foodName.includes('dinner') || foodName.includes('lunch')) {
    return { food: foodItem, calories: 600, confidence: 'low' };
  }
  if (foodName.includes('snack') || foodName.includes('breakfast')) {
    return { food: foodItem, calories: 300, confidence: 'low' };
  }
  
  // Default fallback
  return { food: foodItem, calories: 200, confidence: 'low' };
}

// Get suggestions for partial input
export function getFoodSuggestions(partial: string): string[] {
  if (!partial || partial.length < 2) return [];
  
  const input = partial.toLowerCase();
  const matches = Object.keys(FOOD_DATABASE)
    .filter(food => food.includes(input))
    .slice(0, 8);
  
  return matches;
}
