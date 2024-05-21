const mongoose = require('mongoose');
const schema = mongoose.Schema;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');


const customerSchema = new schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    tel: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        validate: [validator.isEmail, 'please enter a valid email addres']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date
    },
    password: {
        type: String,
        required: true
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    otp: {
         type: String
      },
    otpExpires: {
         type: Date 
        }
});

// Generate JWT token
customerSchema.methods.getJwtToken = function() {
    return jwt.sign({ id: this._id }, process.env.JWT_SEC, {
        expiresIn: '7d'
    });
};

// Hash password before saving
customerSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const hashedPassword = await bcrypt.hash(this.password, 10);
        this.password = hashedPassword;
        next();
    } catch (error) {
        next(error);
    }
});

// Generate Password Reset Token
customerSchema.methods.generatePasswordResetToken = function() {
    const resetToken = crypto.randomBytes(5).toString('hex');

    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour

    return resetToken;
};

module.exports = mongoose.model('customer', customerSchema);
