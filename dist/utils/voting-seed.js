"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVotingTestData = void 0;
const voting_campaign_1 = __importDefault(require("../models/voting-campaign"));
const vote_entry_1 = __importDefault(require("../models/vote-entry"));
const user_1 = __importDefault(require("../models/user"));
const createVotingTestData = async () => {
    try {
        console.log('🌱 Creating voting test data...');
        // Find an admin user to create campaigns
        const adminUser = await user_1.default.findOne({ role: 'admin' });
        if (!adminUser) {
            console.log('❌ No admin user found. Please create an admin user first.');
            return;
        }
        // Check if test campaigns already exist
        const existingCampaigns = await voting_campaign_1.default.find({
            title: { $regex: /Test Campaign/, $options: 'i' }
        });
        if (existingCampaigns.length > 0) {
            console.log('✅ Test voting campaigns already exist');
            return;
        }
        // Create test campaigns
        const campaigns = [
            {
                title: 'Test Campaign - Best Design',
                description: 'Vote for the best design concept. This campaign showcases creative design work from our community.',
                imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=400&fit=crop',
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started 1 day ago
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Ends in 7 days
                pointsPerVote: 10,
                maxVotesPerUser: 3,
                votingFrequency: 'once',
                status: 'active',
                createdBy: adminUser._id
            },
            {
                title: 'Test Campaign - Photography Contest',
                description: 'Submit and vote for the best photography. Capture moments that tell a story.',
                imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
                startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Starts in 2 days
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Ends in 14 days
                pointsPerVote: 15,
                maxVotesPerUser: 5,
                votingFrequency: 'daily',
                status: 'draft',
                createdBy: adminUser._id
            },
            {
                title: 'Test Campaign - Completed Contest',
                description: 'This campaign has already ended. View the final results.',
                imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop',
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Started 30 days ago
                endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Ended 7 days ago
                pointsPerVote: 20,
                maxVotesPerUser: 2,
                votingFrequency: 'once',
                status: 'completed',
                createdBy: adminUser._id
            }
        ];
        const createdCampaigns = await voting_campaign_1.default.insertMany(campaigns);
        console.log(`✅ Created ${createdCampaigns.length} test campaigns`);
        // Create test entries for each campaign
        const entries = [
            // Entries for Design Campaign
            {
                title: 'Modern Minimalist Design',
                description: 'A clean, minimalist approach focusing on typography and white space.',
                imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop',
                campaignId: createdCampaigns[0]._id,
                voteCount: 25,
                isActive: true
            },
            {
                title: 'Colorful Abstract Art',
                description: 'Bold colors and abstract shapes creating a vibrant visual experience.',
                imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=400&fit=crop',
                campaignId: createdCampaigns[0]._id,
                voteCount: 18,
                isActive: true
            },
            {
                title: 'Vintage Retro Style',
                description: 'Classic retro design with modern elements and nostalgic appeal.',
                imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
                campaignId: createdCampaigns[0]._id,
                voteCount: 32,
                isActive: true
            },
            {
                title: 'Futuristic Tech Design',
                description: 'High-tech design with glowing elements and advanced aesthetics.',
                imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop',
                campaignId: createdCampaigns[0]._id,
                voteCount: 15,
                isActive: true
            },
            // Entries for Photography Campaign
            {
                title: 'Sunset at the Beach',
                description: 'Golden hour photography capturing the perfect moment of sunset.',
                imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
                campaignId: createdCampaigns[1]._id,
                voteCount: 0,
                isActive: true
            },
            {
                title: 'Urban Street Photography',
                description: 'Capturing the essence of city life through candid street photography.',
                imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=400&fit=crop',
                campaignId: createdCampaigns[1]._id,
                voteCount: 0,
                isActive: true
            },
            // Entries for Completed Campaign
            {
                title: 'Mountain Landscape',
                description: 'Breathtaking mountain scenery captured in perfect lighting.',
                imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=400&fit=crop',
                campaignId: createdCampaigns[2]._id,
                voteCount: 45,
                isActive: true
            },
            {
                title: 'City Skyline at Night',
                description: 'Urban photography showcasing the city lights and architecture.',
                imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&h=400&fit=crop',
                campaignId: createdCampaigns[2]._id,
                voteCount: 38,
                isActive: true
            },
            {
                title: 'Portrait Photography',
                description: 'Professional portrait with perfect composition and lighting.',
                imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop',
                campaignId: createdCampaigns[2]._id,
                voteCount: 52,
                isActive: true
            }
        ];
        const createdEntries = await vote_entry_1.default.insertMany(entries);
        console.log(`✅ Created ${createdEntries.length} test entries`);
        console.log('🎉 Voting test data created successfully!');
        console.log('📊 Summary:');
        console.log(`   - ${createdCampaigns.length} campaigns created`);
        console.log(`   - ${createdEntries.length} entries created`);
        console.log('🔗 You can now test the voting feature in the admin panel');
    }
    catch (error) {
        console.error('❌ Error creating voting test data:', error);
    }
};
exports.createVotingTestData = createVotingTestData;
// Run if called directly
if (require.main === module) {
    (0, exports.createVotingTestData)()
        .then(() => {
        console.log('✅ Voting seed completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Voting seed failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=voting-seed.js.map