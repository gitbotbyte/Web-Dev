require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const workspaceSchema = new mongoose.Schema({
  name: String
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  workspaceId: mongoose.Schema.Types.ObjectId
});

const feedbackSchema = new mongoose.Schema(
  {
    content: String,
    channel: String,
    customerLabel: String,
    sourceRef: String,
    sentiment: String,
    sentimentScore: Number,
    theme: String,
    featureArea: String,
    status: String,
    workspaceId: mongoose.Schema.Types.ObjectId
  },
  {
    timestamps: true
  }
);

const Workspace = mongoose.model(
  "Workspace",
  workspaceSchema
);



const User = mongoose.model(
  "User",
  userSchema
);



const Feedback = mongoose.model(
  "Feedback",
  feedbackSchema
);


const examples = [

  {
    channel: "Support Ticket",
    content:
      "Onboarding is confusing and I could not invite my team.",
    theme: "Onboarding",
    sentiment: "NEG",
    score: -0.8
  },

  {
    channel: "App Store",
    content:
      "The dashboard is fast and easy to use.",
    theme: "Dashboard",
    sentiment: "POS",
    score: 0.8
  },

  {
    channel: "NPS Survey",
    content:
      "The product works well but the mobile experience needs improvement.",
    theme: "Mobile",
    sentiment: "NEU",
    score: 0.1
  },

  {
    channel: "Sales Call",
    content:
      "We need SSO before our company can move forward.",
    theme: "Authentication",
    sentiment: "NEG",
    score: -0.5
  },

  {
    channel: "Community",
    content:
      "The new export feature saved our team a lot of time.",
    theme: "Exports",
    sentiment: "POS",
    score: 0.9
  },

  {
    channel: "Support Ticket",
    content:
      "The billing page keeps timing out when downloading invoices.",
    theme: "Billing",
    sentiment: "NEG",
    score: -0.9
  },

  {
    channel: "NPS Survey",
    content:
      "Search is useful but sometimes returns irrelevant results.",
    theme: "Search",
    sentiment: "NEU",
    score: -0.1
  },

  {
    channel: "App Store",
    content:
      "Notifications are much better after the latest update.",
    theme: "Notifications",
    sentiment: "POS",
    score: 0.7
  }

];


async function seed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seeding is disabled in production");
  }

  await mongoose.connect(
    process.env.MONGO_URI
  );

  console.log(
    "Connected to MongoDB"
  );


  await Workspace.deleteMany({});
  await User.deleteMany({});
  await Feedback.deleteMany({});


  const workspace =
    await Workspace.create({

      name:
        "LOOP Demo Workspace"

    });


  const password =
    await bcrypt.hash(
      "Demo@12345",
      10
    );


  await User.create([

    {
      name:
        "Demo Admin",

      email:
        "admin@loop.demo",

      password,

      role:
        "ADMIN",

      workspaceId:
        workspace._id
    },

    {
      name:
        "Demo Analyst",

      email:
        "analyst@loop.demo",

      password,

      role:
        "ANALYST",

      workspaceId:
        workspace._id
    },

    {
      name:
        "Demo Viewer",

      email:
        "viewer@loop.demo",

      password,

      role:
        "VIEWER",

      workspaceId:
        workspace._id
    }

  ]);


  const feedback = [];


  for (
    let i = 0;
    i < 120;
    i++
  ) {

    const item =
      examples[
        i %
          examples.length
      ];


    feedback.push({

      content:
        item.content,

      channel:
        item.channel,

      customerLabel:
        `Customer ${i + 1}`,

      sourceRef:
        `SEED-${i + 1}`,

      sentiment:
        item.sentiment,

      sentimentScore:
        item.score,

      theme:
        item.theme,

      featureArea:
        item.theme,

      status:
        i % 3 === 0
          ? "NEW"
          : i % 3 === 1
          ? "REVIEWED"
          : "ACTIONED",

      workspaceId:
        workspace._id,

      createdAt:
        new Date(
          Date.now() -
            (i % 30) *
              24 *
              60 *
              60 *
              1000
        )

    });

  }


  await Feedback.insertMany(
    feedback
  );


  console.log(
    "Seed complete!"
  );

  console.log(
    "\nDemo accounts:"
  );

  console.log(
    "Admin: admin@loop.demo / Demo@12345"
  );

  console.log(
    "Analyst: analyst@loop.demo / Demo@12345"
  );

  console.log(
    "Viewer: viewer@loop.demo / Demo@12345"
  );

  console.log(
    "\n120 feedback records created."
  );


  await mongoose.disconnect();

}


seed()
  .catch(error => {

    console.error(error);

    process.exit(1);

  });
