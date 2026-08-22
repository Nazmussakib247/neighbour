export interface Service {
  id: number;
  title: string;
  category: string;
  price: number;
  priceUnit: string;
  image: string;
  provider: Provider;
  location: string;
  distance: string;
  rating: number;
  reviewCount: number;
  description: string;
  featured?: boolean;
}

export interface Provider {
  id: number;
  userId?: number; // users.id — used for messaging (present when loaded from the backend)
  name: string;
  avatar: string;
  title: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  yearsExp: number;
  location: string;
  bio: string;
  services: ProviderService[];
  credentials: string[];
  tags: string[];
  topPro?: boolean;
  heroImage: string;
}

export interface ProviderService {
  id?: number; // present when loaded from the backend
  name: string;
  price: number;
  priceUnit: string;
  description: string;
}

export interface Review {
  id: number;
  author: string;
  avatar: string;
  date: string;
  rating: number;
  text: string;
  serviceTag: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export const categories: Category[] = [
  { id: 'cleaning', name: 'Home Cleaning', icon: 'Sparkles', count: 234 },
  { id: 'plumbing', name: 'Plumbing', icon: 'Wrench', count: 189 },
  { id: 'electrical', name: 'Electrical', icon: 'Zap', count: 156 },
  { id: 'carpentry', name: 'Carpentry', icon: 'Hammer', count: 98 },
  { id: 'painting', name: 'Painting', icon: 'Palette', count: 145 },
  { id: 'moving', name: 'Moving', icon: 'Truck', count: 112 },
  { id: 'gardening', name: 'Gardening', icon: 'Leaf', count: 87 },
  { id: 'petcare', name: 'Pet Care', icon: 'Dog', count: 76 },
  { id: 'photography', name: 'Photography', icon: 'Camera', count: 134 },
  { id: 'tutoring', name: 'Tutoring', icon: 'GraduationCap', count: 203 },
  { id: 'fitness', name: 'Fitness', icon: 'Dumbbell', count: 167 },
  { id: 'events', name: 'Event Planning', icon: 'Calendar', count: 89 },
];

export const marqueeCategories2: Category[] = [
  { id: 'webdesign', name: 'Web Design', icon: 'Globe', count: 145 },
  { id: 'accounting', name: 'Accounting', icon: 'Calculator', count: 67 },
  { id: 'massage', name: 'Massage', icon: 'Heart', count: 123 },
  { id: 'autorepair', name: 'Auto Repair', icon: 'Car', count: 98 },
  { id: 'catering', name: 'Catering', icon: 'Utensils', count: 76 },
  { id: 'interior', name: 'Interior Design', icon: 'Sofa', count: 54 },
  { id: 'appliance', name: 'Appliance Repair', icon: 'Settings', count: 112 },
  { id: 'yoga', name: 'Yoga', icon: 'Activity', count: 89 },
  { id: 'locksmith', name: 'Locksmith', icon: 'Key', count: 45 },
  { id: 'laundry', name: 'Laundry', icon: 'Shirt', count: 34 },
  { id: 'handyman', name: 'Handyman', icon: 'Tool', count: 198 },
  { id: 'techsupport', name: 'Tech Support', icon: 'Monitor', count: 156 },
];

export const providers: Provider[] = [
  {
    id: 1,
    name: 'Rafiqul I.',
    avatar: '/images/pro-tom.jpg',
    title: 'Master Plumber',
    verified: true,
    rating: 4.9,
    reviewCount: 127,
    yearsExp: 12,
    location: 'Sonadanga, Khulna',
    bio: "I've been serving the Khulna community for over 12 years. From emergency leaks to full bathroom renovations, I bring expertise and care to every job. My goal is simple: fix it right the first time, at a fair price. I specialize in residential plumbing and take pride in leaving every home cleaner than I found it.",
    services: [
      { name: 'Pipe Repair', price: 450, priceUnit: 'hr', description: 'Leak detection and pipe repair for all types of plumbing systems' },
      { name: 'Drain Cleaning', price: 400, priceUnit: 'hr', description: 'Professional drain cleaning and unclogging services' },
      { name: 'Water Heater Install', price: 600, priceUnit: 'hr', description: 'Installation and replacement of geysers and water heaters' },
      { name: 'Emergency Call', price: 800, priceUnit: 'visit', description: '24/7 emergency plumbing service with rapid response' },
    ],
    credentials: ['Background checked', 'Licensed Plumber (Khulna City Corporation)', 'Fully insured'],
    tags: ['Pipe Repair', 'Drain Cleaning', 'Water Heater Install', 'Emergency Calls', 'Bathroom Renovation'],
    topPro: true,
    heroImage: '/images/pro-tom.jpg',
  },
  {
    id: 2,
    name: 'Shirin A.',
    avatar: '/images/pro-sarah.jpg',
    title: 'Professional Cleaner',
    verified: true,
    rating: 4.9,
    reviewCount: 86,
    yearsExp: 8,
    location: 'Khalishpur, Khulna',
    bio: 'With 8 years of experience, I provide meticulous home cleaning services across Khulna. I use eco-friendly products and pay attention to every detail. Your home will sparkle!',
    services: [
      { name: 'Deep Cleaning', price: 350, priceUnit: 'hr', description: 'Thorough deep cleaning of your entire home' },
      { name: 'Regular Cleaning', price: 250, priceUnit: 'hr', description: 'Weekly or bi-weekly maintenance cleaning' },
      { name: 'Move-in/Move-out', price: 400, priceUnit: 'hr', description: 'Complete cleaning for moving transitions' },
    ],
    credentials: ['Background checked', 'Insured', 'Eco-friendly certified'],
    tags: ['Deep Cleaning', 'Regular Cleaning', 'Move-in Cleaning', 'Eco-friendly'],
    heroImage: '/images/pro-sarah.jpg',
  },
  {
    id: 3,
    name: 'Tania R.',
    avatar: '/images/pro-nina.jpg',
    title: 'Portrait Photographer',
    verified: true,
    rating: 4.8,
    reviewCount: 64,
    yearsExp: 6,
    location: 'Shibbari, Khulna',
    bio: 'Capturing authentic moments with a creative eye. Specializing in portraits, headshots, and event photography. My studio near Shibbari Mor is fully equipped.',
    services: [
      { name: 'Headshot Session', price: 2500, priceUnit: 'session', description: 'Professional headshots for LinkedIn, CV, or corporate use' },
      { name: 'Portrait Session', price: 3500, priceUnit: 'session', description: 'Creative portrait photography with multiple outfit changes' },
      { name: 'Event Coverage', price: 2000, priceUnit: 'hr', description: 'Full event photography with edited digital gallery' },
    ],
    credentials: ['Background checked', 'BFA Photography (Khulna University)', 'BPS Member'],
    tags: ['Headshots', 'Portraits', 'Events', 'Studio'],
    heroImage: '/images/pro-nina.jpg',
  },
  {
    id: 4,
    name: 'Jamal H.',
    avatar: '/images/pro-diego.jpg',
    title: 'Handyman',
    verified: true,
    rating: 4.8,
    reviewCount: 203,
    yearsExp: 15,
    location: 'Daulatpur, Khulna',
    bio: 'Your friendly neighbourhood handyman in Khulna. No job is too small! From furniture assembly to TV mounting, I handle it all with care and precision.',
    services: [
      { name: 'Furniture Assembly', price: 400, priceUnit: 'hr', description: 'Expert assembly of all furniture brands and types' },
      { name: 'TV Mounting', price: 600, priceUnit: 'unit', description: 'Secure TV mounting with cable management' },
      { name: 'Minor Repairs', price: 350, priceUnit: 'hr', description: 'General home repairs and fixes' },
    ],
    credentials: ['Background checked', 'Insured', '15+ years experience'],
    tags: ['Furniture Assembly', 'TV Mounting', 'Repairs', 'Installation'],
    heroImage: '/images/pro-diego.jpg',
  },
  {
    id: 5,
    name: 'Nusrat J.',
    avatar: '/images/pro-aisha.jpg',
    title: 'Yoga Instructor',
    verified: true,
    rating: 4.9,
    reviewCount: 91,
    yearsExp: 10,
    location: 'Nirala, Khulna',
    bio: 'Certified yoga instructor offering private and group sessions in Khulna. I tailor each session to your goals, whether it is flexibility, strength, or mindfulness.',
    services: [
      { name: 'Private Session', price: 1000, priceUnit: 'session', description: 'One-on-one personalized yoga instruction' },
      { name: 'Group Class', price: 300, priceUnit: 'person', description: 'Small group yoga classes (up to 6 people)' },
      { name: 'Corporate Wellness', price: 3000, priceUnit: 'session', description: 'Office yoga sessions for team wellness' },
    ],
    credentials: ['Background checked', 'RYT-500 Certified', 'First Aid Certified'],
    tags: ['Vinyasa', 'Hatha', 'Meditation', 'Corporate'],
    heroImage: '/images/pro-aisha.jpg',
  },
];

export const services: Service[] = [
  {
    id: 1,
    title: 'Deep Home Cleaning',
    category: 'Home Cleaning',
    price: 350,
    priceUnit: 'hr',
    image: '/images/service-cleaning.jpg',
    provider: providers[1],
    location: 'Khalishpur, Khulna',
    distance: '0.5 km',
    rating: 4.9,
    reviewCount: 86,
    description: 'Thorough deep cleaning service for your entire home.',
    featured: true,
  },
  {
    id: 2,
    title: 'Same-Day Plumbing Repair',
    category: 'Plumbing',
    price: 500,
    priceUnit: 'hr',
    image: '/images/service-plumbing.jpg',
    provider: providers[0],
    location: 'Sonadanga, Khulna',
    distance: '0.8 km',
    rating: 4.9,
    reviewCount: 127,
    description: 'Emergency plumbing repairs with rapid response time.',
    featured: true,
  },
  {
    id: 3,
    title: 'Professional Headshot Session',
    category: 'Photography',
    price: 2500,
    priceUnit: 'session',
    image: '/images/service-photography.jpg',
    provider: providers[2],
    location: 'Shibbari, Khulna',
    distance: '2.1 km',
    rating: 4.8,
    reviewCount: 64,
    description: 'Studio-quality headshots for professionals.',
    featured: true,
  },
  {
    id: 4,
    title: 'Furniture Assembly & Mounting',
    category: 'Handyman',
    price: 400,
    priceUnit: 'hr',
    image: '/images/service-assembly.jpg',
    provider: providers[3],
    location: 'Daulatpur, Khulna',
    distance: '1.5 km',
    rating: 4.8,
    reviewCount: 203,
    description: 'Expert furniture assembly and TV mounting services.',
    featured: true,
  },
  {
    id: 5,
    title: 'Private Yoga Instruction',
    category: 'Fitness',
    price: 1000,
    priceUnit: 'session',
    image: '/images/service-yoga.jpg',
    provider: providers[4],
    location: 'Nirala, Khulna',
    distance: '3.2 km',
    rating: 4.9,
    reviewCount: 91,
    description: 'Personalized yoga sessions tailored to your goals.',
    featured: true,
  },
  {
    id: 6,
    title: 'Residential Painting',
    category: 'Painting',
    price: 300,
    priceUnit: 'hr',
    image: '/images/step-3-done.jpg',
    provider: providers[0],
    location: 'Boyra, Khulna',
    distance: '1.2 km',
    rating: 4.7,
    reviewCount: 45,
    description: 'Interior and exterior painting with premium materials.',
  },
  {
    id: 7,
    title: 'Electrical Repair & Installation',
    category: 'Electrical',
    price: 450,
    priceUnit: 'hr',
    image: '/images/pro-diego.jpg',
    provider: providers[0],
    location: 'Sonadanga, Khulna',
    distance: '0.9 km',
    rating: 4.8,
    reviewCount: 73,
    description: 'Licensed electrical work for homes and businesses.',
  },
  {
    id: 8,
    title: 'Dog Walking & Pet Sitting',
    category: 'Pet Care',
    price: 250,
    priceUnit: 'visit',
    image: '/images/pro-nina.jpg',
    provider: providers[4],
    location: 'Nirala, Khulna',
    distance: '0.4 km',
    rating: 4.9,
    reviewCount: 52,
    description: 'Reliable pet care with photo updates.',
  },
  {
    id: 9,
    title: 'Math & Science Tutoring',
    category: 'Tutoring',
    price: 400,
    priceUnit: 'hr',
    image: '/images/step-1-find.jpg',
    provider: providers[2],
    location: 'Moylapota, Khulna',
    distance: '2.5 km',
    rating: 4.8,
    reviewCount: 38,
    description: 'Expert tutoring for school, college, and university admission students.',
  },
  {
    id: 10,
    title: 'Garden Design & Maintenance',
    category: 'Gardening',
    price: 300,
    priceUnit: 'hr',
    image: '/images/step-2-connect.jpg',
    provider: providers[1],
    location: 'Gollamari, Khulna',
    distance: '1.8 km',
    rating: 4.7,
    reviewCount: 29,
    description: 'Beautiful garden design and regular maintenance.',
  },
  {
    id: 11,
    title: 'Local Moving Service',
    category: 'Moving',
    price: 1200,
    priceUnit: 'hr',
    image: '/images/pro-tom.jpg',
    provider: providers[3],
    location: 'Rupsha, Khulna',
    distance: '1.0 km',
    rating: 4.6,
    reviewCount: 87,
    description: 'Careful moving service with truck and equipment included.',
  },
  {
    id: 12,
    title: 'Wedding Photography Package',
    category: 'Photography',
    price: 40000,
    priceUnit: 'package',
    image: '/images/pro-aisha.jpg',
    provider: providers[2],
    location: 'Shibbari, Khulna',
    distance: '2.0 km',
    rating: 4.9,
    reviewCount: 34,
    description: 'Full wedding day coverage with edited digital gallery.',
  },
  {
    id: 13,
    title: 'Custom Carpentry & Woodwork',
    category: 'Carpentry',
    price: 450,
    priceUnit: 'hr',
    image: '/images/service-assembly.jpg',
    provider: providers[3],
    location: 'Daulatpur, Khulna',
    distance: '1.6 km',
    rating: 4.8,
    reviewCount: 41,
    description: 'Custom shelving, cabinets, and trim work built to fit your space.',
  },
  {
    id: 14,
    title: 'Event Planning & Coordination',
    category: 'Event Planning',
    price: 15000,
    priceUnit: 'project',
    image: '/images/step-2-connect.jpg',
    provider: providers[2],
    location: 'Moylapota, Khulna',
    distance: '2.3 km',
    rating: 4.7,
    reviewCount: 23,
    description: 'Full-service planning for birthdays, holud nights, and small corporate events.',
  },
];

export const featuredServices = services.filter(s => s.featured);

export const reviews: Review[] = [
  {
    id: 1,
    author: 'Farhana Y.',
    avatar: 'FY',
    date: '2 weeks ago',
    rating: 5,
    text: 'Rafiqul bhai was incredible! He fixed our leaking pipe in under an hour and was so professional. Highly recommend his services to anyone in Khulna.',
    serviceTag: 'Pipe Repair',
  },
  {
    id: 2,
    author: 'Kamrul H.',
    avatar: 'KH',
    date: '1 month ago',
    rating: 5,
    text: 'Best plumber I have ever hired. Fair pricing, excellent work, and left everything spotless. Will definitely call again for any plumbing needs.',
    serviceTag: 'Drain Cleaning',
  },
  {
    id: 3,
    author: 'Sadia I.',
    avatar: 'SI',
    date: '3 weeks ago',
    rating: 4,
    text: 'Great service overall. Rafiqul was punctual and knowledgeable. The only reason for 4 stars is it took slightly longer than estimated, but the quality was worth it.',
    serviceTag: 'Water Heater Install',
  },
  {
    id: 4,
    author: 'Mahmud H.',
    avatar: 'MH',
    date: '2 months ago',
    rating: 5,
    text: 'Called for an emergency leak at 10 PM and Rafiqul arrived within 30 minutes. Saved us from major water damage. True lifesaver!',
    serviceTag: 'Emergency Call',
  },
  {
    id: 5,
    author: 'Rumana P.',
    avatar: 'RP',
    date: '1 week ago',
    rating: 5,
    text: 'Had a full bathroom renovation done and the results are stunning. Rafiqul handled everything from plumbing to fixture installation. Absolutely thrilled!',
    serviceTag: 'Bathroom Renovation',
  },
  {
    id: 6,
    author: 'Tanvir A.',
    avatar: 'TA',
    date: '3 days ago',
    rating: 5,
    text: 'Professional, courteous, and fairly priced. What more could you ask for? Already recommended him to three neighbours.',
    serviceTag: 'Pipe Repair',
  },
];

export const adminStats = {
  totalUsers: 2847,
  activeServices: 1523,
  avgRating: 4.7,
  pendingProviders: 1,
  grossSales: 482000,
  revenue: 72300, // platform commission = 15% of gross sales
  commissionRate: 0.15,
  trends: {
    users: { pct: 6.5, up: true },
    services: { pct: 3.2, up: true },
    sales: { pct: 12.1, up: true },
    revenue: { pct: 12.1, up: true },
  },
  salesByService: [
    { service: 'Deep Home Cleaning', category: 'Home Cleaning', bookings: 142, gross: 118400, commission: 17760 },
    { service: 'Same-Day Plumbing Repair', category: 'Plumbing', bookings: 98, gross: 96500, commission: 14475 },
    { service: 'Professional Headshot Session', category: 'Photography', bookings: 41, gross: 82000, commission: 12300 },
    { service: 'Furniture Assembly & Mounting', category: 'Handyman', bookings: 76, gross: 60800, commission: 9120 },
    { service: 'Private Yoga Instruction', category: 'Fitness', bookings: 53, gross: 53000, commission: 7950 },
  ],
  salesByCategory: [
    { name: 'Home Cleaning', bookings: 168, gross: 142000, commission: 21300 },
    { name: 'Plumbing', bookings: 121, gross: 118600, commission: 17790 },
    { name: 'Photography', bookings: 44, gross: 88000, commission: 13200 },
    { name: 'Handyman', bookings: 82, gross: 66400, commission: 9960 },
    { name: 'Fitness', bookings: 58, gross: 57000, commission: 8550 },
  ],
  userGrowth: [120, 145, 180, 220, 195, 250, 310, 280, 340, 380, 420, 450],
  revenueData: [28000, 32000, 41000, 38000, 45000, 52000, 48000, 56000, 61000, 58000, 65000, 72000],
  revenueWeek: [8500, 12000, 9500, 15000, 11000, 18000, 14500],
  revenueWeekLabels: ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
  revenueYear: [120000, 185000, 260000, 372000, 482000],
  revenueYearLabels: ['2022', '2023', '2024', '2025', '2026'],
  categoryDistribution: [
    { name: 'Home Cleaning', value: 234, color: '#FF6B35' },
    { name: 'Plumbing', value: 189, color: '#2E5CFF' },
    { name: 'Electrical', value: 156, color: '#22C55E' },
    { name: 'Photography', value: 134, color: '#FACC15' },
    { name: 'Tutoring', value: 203, color: '#8B7E74' },
    { name: 'Fitness', value: 167, color: '#F7C59F' },
    { name: 'Other', value: 440, color: '#FFE4D1' },
  ],
  recentBookings: [
    { id: 1, customer: 'Ayesha Siddika', service: 'Deep Cleaning', professional: 'Shirin A.', date: '2026-05-24', amount: 1400, status: 'Completed' },
    { id: 2, customer: 'Rakib Hasan', service: 'Pipe Repair', professional: 'Rafiqul I.', date: '2026-05-24', amount: 1350, status: 'Pending' },
    { id: 3, customer: 'Moushumi Akter', service: 'Headshot Session', professional: 'Tania R.', date: '2026-05-23', amount: 2500, status: 'Completed' },
    { id: 4, customer: 'Sohel Rana', service: 'Furniture Assembly', professional: 'Jamal H.', date: '2026-05-23', amount: 1200, status: 'In Progress' },
    { id: 5, customer: 'Nadia Islam', service: 'Yoga Session', professional: 'Nusrat J.', date: '2026-05-22', amount: 1000, status: 'Completed' },
    { id: 6, customer: 'Fahim Chowdhury', service: 'TV Mounting', professional: 'Jamal H.', date: '2026-05-22', amount: 600, status: 'Cancelled' },
    { id: 7, customer: 'Rima Khatun', service: 'Electrical Repair', professional: 'Rafiqul I.', date: '2026-05-21', amount: 1800, status: 'Completed' },
  ],
};

export const teamMembers = [
  {
    name: 'Sabrina Ibrahim',
    role: 'Department of Computer Science & Engineering (CSE)',
    image: '/images/team-sabrina.svg',
  },
];

// Icon component mapping for categories
export const iconMap: Record<string, string> = {
  Sparkles: 'Sparkles', Wrench: 'Wrench', Zap: 'Zap', Hammer: 'Hammer',
  Palette: 'Palette', Truck: 'Truck', Leaf: 'Leaf', Dog: 'Dog',
  Camera: 'Camera', GraduationCap: 'GraduationCap', Dumbbell: 'Dumbbell',
  Calendar: 'Calendar', Globe: 'Globe', Calculator: 'Calculator',
  Heart: 'Heart', Car: 'Car', Utensils: 'Utensils', Sofa: 'Sofa',
  Settings: 'Settings', Activity: 'Activity', Key: 'Key',
  Shirt: 'Shirt', Tool: 'Tool', Monitor: 'Monitor',
};
