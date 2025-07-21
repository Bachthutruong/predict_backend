const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Contest = require('../src/models/contest');
const UserContest = require('../src/models/user-contest');
const User = require('../src/models/user');

async function seedContestData() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing contest data
    await Contest.deleteMany({});
    await UserContest.deleteMany({});
    console.log('Cleared existing contest data');

    // Get admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('No admin user found, creating one...');
      const newAdmin = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        role: 'admin',
        points: 1000,
        isEmailVerified: true
      });
      await newAdmin.save();
      console.log('Created admin user');
    }

    // Create test contests
    const contests = [
      {
        title: 'Guess the Number',
        description: 'Guess the correct number between 1 and 100. The closest guess wins!',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        pointsPerAnswer: 10,
        rewardPoints: 50,
        status: 'active',
        authorId: adminUser._id
      },
      {
        title: 'Word Puzzle Challenge',
        description: 'Unscramble the letters to form a meaningful word. Hint: It\'s related to technology.',
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        pointsPerAnswer: 15,
        rewardPoints: 75,
        status: 'active',
        authorId: adminUser._id
      },
      {
        title: 'Math Challenge',
        description: 'Solve this equation: 15 + 27 × 3 - 8 ÷ 2 = ?',
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        pointsPerAnswer: 20,
        rewardPoints: 100,
        answer: '88',
        isAnswerPublished: true,
        status: 'finished',
        authorId: adminUser._id
      }
    ];

    const createdContests = await Contest.insertMany(contests);
    console.log(`Created ${createdContests.length} contests`);

    // Create some test submissions for the finished contest
    const users = await User.find({ role: 'user' }).limit(5);
    if (users.length > 0) {
      const finishedContest = createdContests[2]; // Math Challenge
      const submissions = [
        { answer: '88', isCorrect: true, rewardPointsEarned: 100 },
        { answer: '90', isCorrect: false, rewardPointsEarned: 0 },
        { answer: '88', isCorrect: true, rewardPointsEarned: 100 },
        { answer: '85', isCorrect: false, rewardPointsEarned: 0 },
        { answer: '88', isCorrect: true, rewardPointsEarned: 100 }
      ];

      for (let i = 0; i < Math.min(users.length, submissions.length); i++) {
        const userContest = new UserContest({
          contestId: finishedContest._id,
          userId: users[i]._id,
          answer: submissions[i].answer,
          isCorrect: submissions[i].isCorrect,
          pointsSpent: finishedContest.pointsPerAnswer,
          rewardPointsEarned: submissions[i].rewardPointsEarned
        });
        await userContest.save();

        // Update user points
        await User.findByIdAndUpdate(users[i]._id, {
          $inc: { 
            points: -finishedContest.pointsPerAnswer + submissions[i].rewardPointsEarned 
          }
        });
      }
      console.log(`Created ${Math.min(users.length, submissions.length)} test submissions`);
    }

    console.log('Contest seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding contest data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
seedContestData(); 