const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerControllers');


//customer routes
router.post('/add/getotp', customerController.requestOtp);
router.post('/add/createcustomer', customerController.verifyOtpAndCreateCustomer);
router.get('/getallcustomers', customerController.getallcustomers);
router.put('/updatecustomer', customerController.updatecustomer);
router.delete('/deletecustomer', customerController.deletecustomer);
router.get('/getcustomerbyid', customerController.getcustomerbyid);
router.get('/userlogin', customerController.userlogin);
router.post('/forgotpassword', customerController.forgotpassword);
router.put('/updatepassword', customerController.updatepassword);





module.exports = router;