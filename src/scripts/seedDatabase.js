const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Post = require('../models/Post');
const Category = require('../models/Category');
const Author = require('../models/Author');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Sample data
const sampleCategories = [
  {
    name: 'Destinations',
    description: 'Explore amazing travel destinations around the world',
    color: '#3B82F6',
    icon: 'map-pin',
    isFeatured: true,
    sortOrder: 1
  },
  {
    name: 'Adventure',
    description: 'Thrilling adventures and outdoor activities',
    color: '#10B981',
    icon: 'mountain',
    isFeatured: true,
    sortOrder: 2
  },
  {
    name: 'Culture',
    description: 'Immerse yourself in local cultures and traditions',
    color: '#F59E0B',
    icon: 'users',
    isFeatured: true,
    sortOrder: 3
  },
  {
    name: 'Food & Drink',
    description: 'Culinary experiences and local delicacies',
    color: '#EF4444',
    icon: 'utensils',
    isFeatured: true,
    sortOrder: 4
  },
  {
    name: 'Budget Travel',
    description: 'Travel tips and tricks for budget-conscious explorers',
    color: '#8B5CF6',
    icon: 'dollar-sign',
    isFeatured: false,
    sortOrder: 5
  },
  {
    name: 'Luxury Travel',
    description: 'Premium travel experiences and luxury accommodations',
    color: '#F97316',
    icon: 'crown',
    isFeatured: false,
    sortOrder: 6
  }
];

const sampleAuthors = [
  {
    name: 'Sarah Johnson',
    email: 'sarah@loveoftravel.com',
    bio: 'Travel writer and photographer with over 10 years of experience exploring the world. Passionate about sustainable travel and cultural immersion.',
    shortBio: 'Travel writer and photographer exploring the world sustainably.',
    role: 'author',
    isActive: true,
    isVerified: true,
    isFeatured: true,
    expertise: ['Photography', 'Sustainable Travel', 'Cultural Immersion', 'Adventure Travel'],
    specializations: ['Southeast Asia', 'Europe', 'South America'],
    languages: ['English', 'Spanish', 'French'],
    location: {
      city: 'San Francisco',
      country: 'United States',
      timezone: 'America/Los_Angeles'
    },
    socialLinks: {
      website: 'https://sarahjohnson.travel',
      twitter: 'sarahjtravel',
      instagram: 'sarahjtravel',
      linkedin: 'sarah-johnson-travel'
    }
  },
  {
    name: 'Michael Chen',
    email: 'michael@loveoftravel.com',
    bio: 'Adventure enthusiast and travel blogger specializing in outdoor activities and extreme sports. Always seeking the next adrenaline rush.',
    shortBio: 'Adventure enthusiast and extreme sports blogger.',
    role: 'author',
    isActive: true,
    isVerified: true,
    isFeatured: true,
    expertise: ['Adventure Sports', 'Mountain Climbing', 'Scuba Diving', 'Hiking'],
    specializations: ['Mountains', 'Oceans', 'Deserts'],
    languages: ['English', 'Mandarin', 'Japanese'],
    location: {
      city: 'Denver',
      country: 'United States',
      timezone: 'America/Denver'
    },
    socialLinks: {
      website: 'https://michaelchenadventure.com',
      twitter: 'mchenadventure',
      instagram: 'mchenadventure',
      youtube: 'mchenadventure'
    }
  },
  {
    name: 'Elena Rodriguez',
    email: 'elena@loveoftravel.com',
    bio: 'Food and culture writer with a passion for discovering local cuisines and traditions. Based in Barcelona but always on the move.',
    shortBio: 'Food and culture writer discovering local cuisines worldwide.',
    role: 'author',
    isActive: true,
    isVerified: true,
    isFeatured: true,
    expertise: ['Food Writing', 'Cultural Studies', 'Wine Tasting', 'Cooking'],
    specializations: ['Mediterranean', 'Latin America', 'Asia'],
    languages: ['English', 'Spanish', 'Italian', 'Portuguese'],
    location: {
      city: 'Barcelona',
      country: 'Spain',
      timezone: 'Europe/Madrid'
    },
    socialLinks: {
      website: 'https://elenafoodculture.com',
      twitter: 'elenafood',
      instagram: 'elenafoodculture',
      tiktok: 'elenafoodculture'
    }
  }
];

const samplePosts = [
  {
    title: 'The Ultimate Guide to Backpacking Through Southeast Asia',
    content: `
      <h2>Introduction</h2>
      <p>Southeast Asia is a backpacker's paradise, offering incredible diversity, affordability, and unforgettable experiences. From the bustling streets of Bangkok to the pristine beaches of the Philippines, this region has something for every traveler.</p>
      
      <h2>Planning Your Route</h2>
      <p>When planning your Southeast Asia backpacking trip, consider the weather patterns and visa requirements. The best time to visit most countries is during the dry season (November to March), though this varies by location.</p>
      
      <h2>Essential Packing List</h2>
      <ul>
        <li>Lightweight, quick-dry clothing</li>
        <li>Comfortable walking shoes</li>
        <li>Universal power adapter</li>
        <li>First aid kit</li>
        <li>Water purification tablets</li>
      </ul>
      
      <h2>Budget Tips</h2>
      <p>One of the biggest advantages of backpacking in Southeast Asia is the low cost. You can easily travel on $30-50 per day, including accommodation, food, and activities.</p>
      
      <h2>Must-Visit Destinations</h2>
      <p>Don't miss the ancient temples of Angkor Wat in Cambodia, the stunning limestone karsts of Halong Bay in Vietnam, and the pristine beaches of Thailand's islands.</p>
    `,
    excerpt: 'Discover the ultimate guide to backpacking through Southeast Asia, including budget tips, essential packing lists, and must-visit destinations.',
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
      alt: 'Backpacker exploring Southeast Asia temples',
      caption: 'Exploring the vibrant culture and stunning landscapes of Southeast Asia'
    },
    tags: ['backpacking', 'southeast-asia', 'budget-travel', 'adventure'],
    status: 'published',
    publishedAt: new Date('2024-01-15'),
    seo: {
      metaTitle: 'Backpacking Southeast Asia Guide',
      metaDescription: 'Complete guide to backpacking Southeast Asia with budget tips, packing lists, and must-visit destinations for the ultimate adventure.',
      keywords: ['southeast asia backpacking', 'budget travel', 'backpacking guide', 'travel tips']
    },
    contentSections: [
      {
        type: 'hero',
        content: {
          title: 'The Ultimate Guide to Backpacking Through Southeast Asia',
          subtitle: 'Discover the best routes, budget tips, and must-visit destinations',
          image: '/images/southeast-asia-hero.jpg'
        },
        order: 1
      },
      {
        type: 'text',
        content: 'Southeast Asia offers incredible diversity and affordability for backpackers...',
        order: 2
      }
    ],
    breadcrumb: [
      { title: 'Home', url: '/', position: 1 },
      { title: 'Destinations', url: '/category/destinations', position: 2 },
      { title: 'Southeast Asia', url: '/category/southeast-asia', position: 3 }
    ],
    isFeatured: true,
    isPinned: false,
    allowComments: true,
    allowSharing: true
  },
  {
    title: 'Hidden Gems of the Italian Coast: Beyond the Amalfi Coast',
    content: `
      <h2>Discovering Italy's Lesser-Known Coastal Treasures</h2>
      <p>While the Amalfi Coast gets all the attention, Italy's coastline is dotted with hidden gems that offer equally stunning views without the crowds.</p>
      
      <h2>Cinque Terre: The Colorful Five</h2>
      <p>These five fishing villages are connected by hiking trails and offer some of the most picturesque views in Italy. Each village has its own unique character and charm.</p>
      
      <h2>Portofino: Luxury Meets Nature</h2>
      <p>This small fishing village has become a playground for the rich and famous, but it's still worth visiting for its natural beauty and charming harbor.</p>
      
      <h2>Puglia's Adriatic Coast</h2>
      <p>The heel of Italy's boot offers pristine beaches, ancient towns, and some of the best seafood in the country.</p>
    `,
    excerpt: 'Explore Italy\'s hidden coastal gems beyond the famous Amalfi Coast, from Cinque Terre to Puglia\'s pristine beaches.',
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
      alt: 'Hidden gems of the Italian coast - Cinque Terre',
      caption: 'Discovering Italy\'s lesser-known coastal treasures'
    },
    tags: ['italy', 'coast', 'hidden-gems', 'europe', 'beaches'],
    status: 'published',
    publishedAt: new Date('2024-01-10'),
    seo: {
      metaTitle: 'Hidden Gems of Italian Coast',
      metaDescription: 'Discover Italy\'s hidden coastal treasures beyond the Amalfi Coast, including Cinque Terre, Portofino, and Puglia\'s pristine beaches.',
      keywords: ['italian coast', 'hidden gems', 'cinque terre', 'portofino', 'puglia']
    },
    isFeatured: true,
    isPinned: false,
    allowComments: true,
    allowSharing: true
  },
  {
    title: 'Sustainable Travel: How to Explore the World Responsibly',
    content: `
      <h2>The Importance of Sustainable Travel</h2>
      <p>As travelers, we have a responsibility to protect the places we visit and the communities we encounter. Sustainable travel is about making choices that benefit both the environment and local communities.</p>
      
      <h2>Choose Eco-Friendly Accommodations</h2>
      <p>Look for hotels and hostels that have environmental certifications and practice sustainable operations. Many accommodations now offer carbon offset programs and use renewable energy.</p>
      
      <h2>Support Local Communities</h2>
      <p>When traveling, make an effort to support local businesses, eat at local restaurants, and purchase souvenirs from local artisans. This helps ensure that tourism benefits the local economy.</p>
      
      <h2>Reduce Your Carbon Footprint</h2>
      <p>Consider alternative transportation methods, pack light, and offset your carbon emissions when flying is necessary.</p>
    `,
    excerpt: 'Learn how to travel sustainably and responsibly, making choices that benefit both the environment and local communities.',
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80',
      alt: 'Sustainable travel practices in nature',
      caption: 'Making responsible choices while exploring the world'
    },
    tags: ['sustainable-travel', 'eco-friendly', 'responsible-travel', 'environment'],
    status: 'published',
    publishedAt: new Date('2024-01-05'),
    seo: {
      metaTitle: 'Sustainable Travel Guide',
      metaDescription: 'Learn how to travel sustainably with eco-friendly practices, supporting local communities and reducing your environmental impact.',
      keywords: ['sustainable travel', 'eco-friendly travel', 'responsible tourism', 'green travel']
    },
    isFeatured: false,
    isPinned: true,
    allowComments: true,
    allowSharing: true
  }
];

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Clear existing data
async function clearData() {
  try {
    await Post.deleteMany({});
    await Category.deleteMany({});
    await Author.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing data');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

// Seed categories
async function seedCategories() {
  try {
    // Process categories to ensure slug and path are generated
    const processedCategories = sampleCategories.map(cat => ({
      ...cat,
      slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      path: cat.path || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }));

    const categories = await Category.insertMany(processedCategories);
    console.log(`Seeded ${categories.length} categories`);
    return categories;
  } catch (error) {
    console.error('Error seeding categories:', error);
    return [];
  }
}

// Seed authors
async function seedAuthors() {
  try {
    // Process authors to ensure slug is generated
    const processedAuthors = sampleAuthors.map(author => ({
      ...author,
      slug: author.slug || author.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      isActive: true // Ensure authors are active
    }));

    const authors = await Author.insertMany(processedAuthors);
    console.log(`Seeded ${authors.length} authors`);
    return authors;
  } catch (error) {
    console.error('Error seeding authors:', error);
    return [];
  }
}

// Seed posts
async function seedPosts(categories, authors) {
  try {
    // Only proceed if we have categories and authors
    if (!categories || categories.length === 0 || !authors || authors.length === 0) {
      console.log('Skipping posts seeding - no categories or authors available');
      return [];
    }

    // Assign categories and authors to posts
    const postsWithRefs = samplePosts.map((post, index) => ({
      ...post,
      slug: post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      categories: [categories[0]._id, categories[1]._id], // Destinations and Adventure
      author: authors[index % authors.length]._id
    }));

    const posts = await Post.insertMany(postsWithRefs);
    console.log(`Seeded ${posts.length} posts`);
    return posts;
  } catch (error) {
    console.error('Error seeding posts:', error);
    return [];
  }
}

// Create admin user
async function createAdminUser() {
  try {
    const adminUser = new User({
      username: 'admin',
      email: 'admin@loveoftravel.com',
      password: 'admin123', // This will be hashed by the pre-save middleware
      firstName: 'Admin',
      lastName: 'User',
      role: 'super_admin',
      isActive: true,
      isEmailVerified: true
    });

    await adminUser.save();
    console.log('Created admin user');
    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
    return null;
  }
}

// Main seeding function
async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    await connectDB();
    await clearData();
    
    const categories = await seedCategories();
    const authors = await seedAuthors();
    const posts = await seedPosts(categories, authors);
    const adminUser = await createAdminUser();
    
    console.log('Database seeding completed successfully!');
    console.log(`Created ${categories.length} categories`);
    console.log(`Created ${authors.length} authors`);
    console.log(`Created ${posts.length} posts`);
    console.log(`Created admin user: admin@loveoftravel.com / admin123`);
    
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
