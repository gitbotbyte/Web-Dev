const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = 3000;
const Employee = require('./models/employee.js');

mongoose.connect('mongodb://127.0.0.1:27017/company');
app.set('view engine', 'ejs');

const getrandom = (arr) => {
  let rno = Math.floor(Math.random() * (arr.length - 1));
  return arr[rno];
}

app.get('/', (req, res) => {
  res.render('index', { foo: 'FOO' });
});

app.get('/generate', async (req, res) => {
  try {
    await Employee.deleteMany({}); // Clear existing data

    let randomnames = ["rohan", "sachin", "rahul"];
    let randomlang = ["python", "javascript", "java"];
    let randomcity = ["delhi", "mumbai", "bangalore"];

    let employees = [];
    for (let i = 0; i < 10; i++) {
      let e = await Employee.create({
        name: getrandom(randomnames),
        salary: Math.floor(Math.random() * 22000),
        language: getrandom(randomlang),
        city: getrandom(randomcity),
        isManager: Math.random() > 0 ? true : false,
      });
      employees.push(e);
    }

    res.json({ message: "Data generated successfully", employees });
  } catch (error) {
    console.error("Error in /generate route:", error);
    res.status(500).json({ error: "An error occurred while generating data." });
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

// document.addEventListener(() => {
//   const generatedata= document.getElementsByClassName('button')
//   generatedata.addEventListener('click',()=>{
//     console.log('button clicked')
//     // app.post('/info',(req,res)=>{
      
//   })
// })

