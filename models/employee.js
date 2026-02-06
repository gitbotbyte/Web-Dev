const mongoose= require('mongoose');
const employeeschema= new mongoose.Schema({
    name: String,
    salary:Number,
    language:String,
    city:String,
    isManager:Boolean
});
const Employee= mongoose.model('Employee',employeeschema);
module.exports =Employee;