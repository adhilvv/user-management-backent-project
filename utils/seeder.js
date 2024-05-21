const customers = require('../data/customer.json');
const Customer = require('../server/models/customer');
const dotenv = require('dotenv');
const connectdatabase = require('../server/config/db');


dotenv.config({path:'config/config.env'});
connectdatabase();

const seedProducts = async ()=>{
    try{
        await Customer.deleteMany();
        console.log('all customers deleted');
        await Customer.insertMany(customers);
        console.log('all customers added');
    }catch(error){
     console.log(error.message);
    }
    process.exit();
}


seedProducts();