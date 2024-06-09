const express = require('express');
const router = express.Router();
const User = require('./../models/user');
const { jwtAuthMiddleware, generateToken } = require('./../jwt');

// POST route to register a new user
router.post('/signup', async (req, res) => {
    try {
        const userData = req.body;

        // Check if an admin user already exists
        if (userData.role === 'admin' && (await User.findOne({ role: 'admin' }))) {
            return res.status(400).json({ error: 'Admin user already exists' });
        }

        // Validate Aadhar Card Number must have exactly 12 digits
        if (!/^\d{12}$/.test(userData.aadharCardNumber)) {
            return res.status(400).json({ error: 'Aadhar Card Number must be exactly 12 digits' });
        }

        // Check if a user with the same Aadhar Card Number already exists
        if (await User.findOne({ aadharCardNumber: userData.aadharCardNumber })) {
            return res.status(400).json({ error: 'User with the same Aadhar Card Number already exists' });
        }

        // Create a new user document using the Mongoose model
        const newUser = new User(userData);

        // Save the new user to the database
        const savedUser = await newUser.save();

        console.log('User data saved:', savedUser);

        // Generate JWT token
        const payload = { id: savedUser.id };
        const token = generateToken(payload);

        res.status(200).json({ user: savedUser, token });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST route to authenticate and login a user
router.post('/login', async (req, res) => {
    try {
        const { aadharCardNumber, password } = req.body;

        // Validate input
        if (!aadharCardNumber || !password) {
            return res.status(400).json({ error: 'Aadhar Card Number and password are required' });
        }

        // Find the user by Aadhar Card Number
        const user = await User.findOne({ aadharCardNumber });

        // If user does not exist or password does not match, return error
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid Aadhar Card Number or Password' });
        }

        // Generate JWT token
        const payload = { id: user.id };
        const token = generateToken(payload);

        res.json({ token });
    } catch (err) {
        console.error('Error logging in user:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET route to fetch user profile
router.get('/profile', jwtAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        res.json({ user });
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT route to update user password
router.put('/profile/password', jwtAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Both currentPassword and newPassword are required' });
        }

        // Find the user by user ID
        const user = await User.findById(userId);

        // If user does not exist or current password does not match, return error
        if (!user || !(await user.comparePassword(currentPassword))) {
            return res.status(401).json({ error: 'Invalid current password' });
        }

        // Update user's password
        user.password = newPassword;
        await user.save();

        console.log('Password updated for user:', user.id);
        res.status(200).json({ message: 'Password updated' });
    } catch (err) {
        console.error('Error updating user password:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
