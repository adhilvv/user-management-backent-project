const Customer = require("../models/customer");
const Otp = require("../models/otp");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const JWT = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const config = require("../config/email");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const { verify } = require("crypto");

// request otp with mail
exports.requestOtp = async (req, res) => {
  const { email } = req.body;

  // Validate email format using regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email format." });
  }

  try {
    // Check if customer already exists
    const existingCustomer = await Otp.findOne({ email });
    if (existingCustomer) {
      return res
        .status(400)
        .json({ success: false, message: "already send otp to this mail " });
    }

    // Generate OTP
    const otp = crypto.randomBytes(3).toString("hex"); // Generate a 6-digit OTP
    const otpExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    // Send OTP email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const mailOptions = {
      from: "adilbasheer.404@gmail.com",
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It is valid for 10 minutes.`, // Plain text version for email clients that do not support HTML
      html: `
        <div style="font-size: 16px; color: #333;">
          <p>Your OTP code is:</p>
          <h1 style="font-size: 24px; color: #007BFF;">${otp}</h1>
          <p>It is valid for 10 minutes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Save OTP and its expiration time to the OTP collection
    await Otp.updateOne(
      { email },
      { email, otp, otpExpires },
      { upsert: true }
    );

    res.status(200).json({ success: true, message: "OTP sent to your email." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error generating OTP." });
  }
};

// verify otp and create customer
exports.verifyOtpAndCreateCustomer = async (req, res) => {
  const { firstName, lastName, tel, email, password, otp } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!firstName) missingFields.push("firstName");
  if (!lastName) missingFields.push("lastName");
  if (!tel) missingFields.push("tel");
  if (!email) missingFields.push("email");
  if (!password) missingFields.push("password");
  if (!otp) missingFields.push("otp");

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
  }
  try {
    // Find OTP by email
    const otpRecord = await Otp.findOne({ email });

    if (
      !otpRecord ||
      otpRecord.otp !== otp ||
      otpRecord.otpExpires < Date.now()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP." });
    }

    // Create a new customer instance and save to the database
    const newCustomer = new Customer({
      firstName,
      lastName,
      tel,
      email,
      password,
    });

    // Save the new customer
    await newCustomer.save();

    // Delete OTP record after successful customer creation
    await Otp.deleteOne({ email });

    // Generate JWT token for the new customer
    const token = newCustomer.getJwtToken();

    // Respond with success and the token
    res.status(200).json({
      success: true,
      message: "signed in succsefuly",
    });

    console.log("auth token is:", token);
    console.log(newCustomer);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error creating customer" });
  }
};

// Get all customers with pagination
exports.getallcustomers = async (req, res) => {
  try {
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1; // Default page number is 1
    const limit = parseInt(req.query.limit) || 20; // Default limit is 10 customers per page

    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Retrieve paginated customers
    const allCustomers = await Customer.find({}).skip(skip).limit(limit);

    // Get the total number of customers
    const totalCustomers = await Customer.countDocuments();

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalCustomers / limit);

    // Respond with paginated results
    res.status(200).json({
      success: true,
      page,
      limit,
      totalPages,
      totalCustomers,
      data: allCustomers,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error retrieving customers" });
  }
};

//Get one customer
exports.getcustomerbyid = async (req, res) => {
  try {
    const customerId = req.query.id;

    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" ,succes:false});
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" ,succes:false});
    }

    res.status(200).json({ message: "Customer found", customer ,succes:true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// update customer
exports.updatecustomer = async (req, res) => {
  try {
    const customerId = req.query.id;

    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" ,succes:false});
    }

    const updatedData = req.body;
    console.log(req.body);

    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: customerId },
      updatedData,
      { new: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({ message: "Customer not found" ,succes:false});
    }
    res
      .status(200)
      .json({ message: "Customer updated successfully", updatedCustomer ,succes:true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

//detele a customer
exports.deletecustomer = async (req, res) => {
  try {
    const customerId = req.query.id;
    console.log(customerId);
    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" ,succes:false});
    }
    const deletedCustomer = await Customer.findOneAndDelete({
      _id: customerId,
    });
    if (!deletedCustomer) {
      return res.status(404).json({ message: "Customer not found" ,succes:false});
    }
    res
      .status(200)
      .json({ message: "Customer deleted successfully", deletedCustomer ,succes:true});
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// User login route
exports.userlogin = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const customer = await Customer.findOne({ email });

    if (!customer) {
      return res.status(404).json({ message: "User not found" ,succes:false });
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);
    console.log(
      "pasword is:",
      req.body.password,
      "existing pasword",
      customer.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password", succes:false });
    }
    req.session.userId = customer._id;
    if (req.session.userId) {
      console.log("created session for this user", req.session);
    }
    // Return success message
    res.status(200).json({ message: "Login successful", user: customer ,succes:true});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// forget pasword

exports.forgotpassword = async (req, res) => {
  try {
    const email = req.body.email;

    const customer = await Customer.findOne({ email });

    if (!customer) {
      return res.status(404).send("No customer with that email found.");
    }

    // Generate a reset token
    const resetToken = customer.generatePasswordResetToken();
    console.log(resetToken);

    customer.password = resetToken;

    await customer.save();

    // Send email with the new password (reset token)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const message = `You requested a password reset. Your new password is: ${resetToken}`;

    await transporter.sendMail({
      to: customer.email,
      subject: "Password Reset Token",
      text: message,
    });

    res.status(201).json({
      succes: true,
      message: "Password reset token sent to email and passwordupdated.",
      customer,
    });
    console.log("Password reset token sent to email and password updated.");
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// update the password
exports.updatepassword = async (req, res) => {
  try {
    const { id, email } = req.query;
    const updatedData = req.body;

    if (!id && !email) {
      return res
        .status(400)
        .json({ message: "Please provide either user ID or email." });
    }

    let customer;
    if (id) {
      customer = await Customer.findById(id);
    } else {
      customer = await Customer.findOne({ email });
    }

    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }
    for (let key in updatedData) {
      if (updatedData.hasOwnProperty(key)) {
        customer[key] = updatedData[key];
      }
    }

    customer.updatedAt = Date.now();
    await customer.save();

    res
      .status(200)
      .json({ message: "Customer updated successfully", customer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
