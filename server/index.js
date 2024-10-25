const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");

require("dotenv").config();

const app = express();
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/test", (req, res) => {
  res.send("testing application 1");
});

// implementation of stack.
class Stack {
  constructor() {
    this.items = [];
  }

  push(number) {
    this.items.push(number);
  }

  pop() {
    if (this.items.length === 0) return "Oops, the stack is empty!";
    return this.items.pop();
  }

  top() {
    return this.items[this.items.length - 1];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }
}

// implementation of binary tree.
class Node {
  constructor(type, value) {
    this.type = type;
    this.left = null;
    this.right = null;
    this.value = value;
  }
}

// create_rule API.
app.get("/create_rule", (req, res) => {
  const str = req.query.rule;
  let st = new Stack();
  let temp = "";
  let arr = [];

  // creating array of strings, containing only brackets, operators and operands.
  for (let i = 0; i < str.length; i++) {
    if (str[i] == "(") arr.push("(");
    else if (str[i] == ")") {
      if (temp.length) arr.push(temp);
      temp = "";
      arr.push(")");
    } else {
      if (str[i] !== " ") temp += str[i];
      else if (temp.length > 0) {
        arr.push(temp);
        temp = "";
      }
    }
  }

  // traversing through array and using stack to create AST tree.
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] == "(") st.push("(");
    else {
      if (arr[i] == "OR" || arr[i] == "AND") {
        let j = new Node("operator", arr[i]);
        st.push(j);
      } else if (arr[i] != ")") {
        if (i + 1 == arr.length || i + 2 == arr.length)
          res.send("Invalid rule syntax.");

        let p = arr[i] + arr[i + 1] + arr[i + 2];
        let j;

        j = new Node("operand", p);
        st.push(j);
        i += 2;
      } else {
        if (st.isEmpty()) res.send("Invalid rule syntax.");

        let p, q, r;

        p = st.top();
        st.pop();

        if (st.isEmpty()) res.send("Invalid rule syntax.");

        q = st.top();
        st.pop();

        if (st.isEmpty()) res.send("Invalid rule syntax.");

        r = st.top();
        st.pop();

        if (st.isEmpty()) res.send("Invalid rule syntax.");

        st.pop();
        q.left = p;
        q.right = r;
        st.push(q);
      }
    }
  }

  if (st.isEmpty()) res.send("Invalid rule syntax.");

  // this contains root node.
  const finalRoot = JSON.stringify(st.top());
  st.pop();

  // SQL query to store root node and corresponding rule string to database.
  const q =
    "insert into application1.rules (`Rule_Root`, `Rule_Str`) values (?)";
  const values = [finalRoot, str];

  db.query(q, [values], (err, result) => {
    if (err) res.send("Error occurred while inserting rule.", err);
    else res.send("Rule inserted successfully.");
  });
});

// combine_rules API.
app.post("/combine_rules", (req, res) => {
  if (req.body.length != 3) res.send("Combining rules failed. Try again.");

  const rule1 = req.body[0];
  const rule2 = req.body[1];
  const operator = req.body[2];

  let j, k, l;

  k = new Node("operator", operator);

  const q = `select Rule_Root from application1.rules where Rule_Str="${rule1}"`;
  const p = `select Rule_Root from application1.rules where Rule_Str="${rule2}"`;
  const newrule = `(${rule1} ${operator} ${rule2})`;

  // nested query to fetch root nodes of the 2 rules given by user, then combining them and storing
  // it in database.
  db.query(q, (err1, result1) => {
    if (err1) res.send("Error occurred while combining rules.", err1);
    else {
      db.query(p, (err2, result2) => {
        if (err2) res.send("Error occurred while combining rules.", err2);
        else {
          j = JSON.parse(result1[0].Rule_Root);
          l = JSON.parse(result2[0].Rule_Root);

          k.left = j;
          k.right = j;

          const m = JSON.stringify(k);
          const newq =
            "insert into application1.rules (`Rule_Root`, `Rule_Str`) values (?)";
          const values = [m, newrule];

          db.query(newq, [values], (err, result) => {
            if (err) res.send("Error occurred while combining rules.", err);
            else res.send("Rules combined successfully.");
          });
        }
      });
    }
  });
});

// function to check whether user provided data matches given rule.
const evaluate = (root, obj) => {
  if (root === null) return 0;

  // it means that the current root contains expression which needs to be checked against user data.
  if (root.left === null && root.right === null) {
    const cur = root.value;
    let d = [];
    let temp = "";

    for (let i = 0; i < cur.length; i++) {
      if (cur[i] != ">" && cur[i] != "<" && cur[i] != "=") temp += cur[i];
      else {
        d.push(temp);
        d.push(cur[i]);
        temp = "";
      }
    }

    if (isNaN(Number(temp))) d.push(temp);
    else d.push(Number(temp));

    if (obj.hasOwnProperty(d[0])) {
      if (d[1] === "=" && obj[d[0]] === d[2]) return 1;
      else if (d[1] === ">" && obj[d[0]] > d[2]) return 1;
      else if (d[1] === "<" && obj[d[0]] < d[2]) return 1;
      else return 0;
    } else return 0;
  }

  let a = 0,
    b = 0;

  // recursively calling left and right children.
  a = evaluate(root.left, obj);
  b = evaluate(root.right, obj);

  // return value according to operator of root.
  if (root.type === "operator" && root.value === "AND") return a && b;
  else if (root.type === "operator" && root.value === "OR") return a || b;
};

// evaluate_rule API.
app.post("/evaluate_rule", (req, res) => {
  const rulestr = req.body[0];
  let obj;

  try {
    obj = JSON.parse(req.body[1]);
  } catch (e) {
    res.send("Invalid data syntax.");
  }

  obj = JSON.parse(req.body[1]);

  const q = `select Rule_Root from application1.rules where Rule_Str="${rulestr}"`;

  // query to fetch root node of rule and calling evaluate() function to return whether user data
  // matches the rule or not.
  db.query(q, (err, result) => {
    if (err) res.send("Error evaluating combining data.", err);
    else {
      const root = JSON.parse(result[0].Rule_Root);
      const ans = evaluate(root, obj);

      if (ans === 1) res.send("Data matches against the rule.");
      else res.send("Data doesn't match against the rule.");
    }
  });
});

app.listen(process.env.PORT, () => {
  console.log("Connected to backend on port " + process.env.PORT + ".");
});
