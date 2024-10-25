import React, { useState } from "react";
import axios from "axios";
import "./Home.css";

const Home = () => {
  // bool variable to display result for 6 cities when website is loaded.
  const [init, setInit] = useState(0);

  // hook to update rule entered by user in input box.
  const [rule, setRule] = useState("");

  // array of rules entered by user.
  const [allRules, setAllRules] = useState([]);

  // storing which 2 rules user wants to combine.
  const [combineRuleIndex1, setCombineRuleIndex1] = useState("Rule 1");
  const [combineRuleIndex2, setCombineRuleIndex2] = useState("Rule 1");

  // storing which operator user want to combine the rules with.
  const [combineRuleOperator, setCombineRuleOperator] = useState("OR");

  // variable to store which rule user wants to test the data against.
  const [selectRule, setSelectRule] = useState(0);

  // variable to update data enteres by user to check it against a rule.
  const [data, setData] = useState("");

  // array of rules whose results we want on screen, as examples.
  const startingRules = [
    "((age > 30 AND department = Marketing) AND (salary > 20000 OR experience > 5))",
    "(((age > 30 AND department = Sales) OR (age < 25 AND department = Marketing)) AND (salary > 50000 OR experience > 5))",
  ];

  const initialise = async () => {
    for (let i = 0; i < startingRules.length; i++)
      setAllRules((prev) => [...prev, startingRules[i]]);

    setInit(1);
  };

  // initialise() function is called only once by setting setInit to 1.
  if (init === 0) {
    initialise();
    setInit(1);
  }

  // function to insert rule to database and create its AST.
  const handleCreateRule = async (e) => {
    e.preventDefault();

    if (!rule) return;

    const existIndex = allRules.findIndex((data) => data === rule);
    if (existIndex !== -1) {
      alert("Rule already exists.");
      setRule("");
      return;
    }

    try {
      await axios.get(`http://localhost:5000/create_rule?rule=${rule}`);

      setAllRules([...allRules, rule]);
      setRule("");
      alert("Rule created successfully.");
    } catch (err) {
      console.log("Error creating rule.", err);
      alert("Error creating rule.");
    }
  };

  // function to combine 2 rules.
  const handleCombineRules = async (e) => {
    e.preventDefault();

    if (combineRuleIndex1[5] === combineRuleIndex2[5]) {
      alert("Choose different rules to combine them.");
      return;
    }

    const rule1 = allRules[combineRuleIndex1[5] - 1];
    const rule2 = allRules[combineRuleIndex2[5] - 1];
    const details = [rule1, rule2, combineRuleOperator];

    try {
      const response = await axios.post(
        `http://localhost:5000/combine_rules`,
        details
      );

      console.log(response.data);
      alert("Rules combined successfully.");
    } catch (err) {
      console.log("error combining rules.", err);
      alert("Error combining rules.");
    }
  };

  // function to get result of whether the user given data matches with user given rule.
  const handleEvaluate = async (e) => {
    e.preventDefault();

    if (!data) return;

    const index = selectRule[5] - 1;
    const ruleStr = allRules[index];
    const details = [ruleStr, data];

    try {
      const response = await axios.post(
        `http://localhost:5000/evaluate_rule`,
        details
      );

      setData("");
      alert(response.data);
    } catch (err) {
      console.log("error fetching evaluation result.", err);
      alert("Error fetching evaluation.");
    }
  };

  return (
    <div className="body">
      <div className="containers">
        <h3>1. Enter a rule:</h3>

        <input
          placeholder="eg. ((age > 30 AND department = Sales) OR (age < 25 AND department = Marketing))"
          className="rule-input"
          value={rule}
          type="textarea"
          onChange={(e) => setRule(e.target.value)}
        />

        <br />

        <button className="btn" onClick={(e) => handleCreateRule(e)}>
          Create Rule
        </button>

        <div>
          <h4>All rules:</h4>

          <ol>
            {allRules.length > 0 &&
              allRules.map((data, index) => {
                return (
                  <li className="all-rules-item" key={index}>
                    {data}
                  </li>
                );
              })}
          </ol>
        </div>
      </div>

      <div className="containers">
        <h3>2. Combine rules:</h3>

        <select
          className="rule-option-select"
          onChange={(e) => setCombineRuleIndex1(e.target.value)}
        >
          {allRules.length > 0 &&
            allRules.map((data, index) => {
              return (
                <option className="rule-option-item" key={index}>
                  Rule {index + 1}
                </option>
              );
            })}
        </select>

        <select
          className="rule-option-select"
          onChange={(e) => setCombineRuleIndex2(e.target.value)}
        >
          {allRules.length > 0 &&
            allRules.map((data, index) => {
              return (
                <option className="rule-option-item" key={index}>
                  Rule {index + 1}
                </option>
              );
            })}
        </select>

        <select
          className="rule-option-select"
          onChange={(e) => setCombineRuleOperator(e.target.value)}
        >
          <option className="rule-option-item" key={1}>
            OR
          </option>
          <option className="rule-option-item" key={2}>
            AND
          </option>
        </select>

        <button className="btn" onClick={(e) => handleCombineRules(e)}>
          Combine
        </button>
      </div>

      <div className="containers">
        <h3>3. Evaluate rule:</h3>

        <p>Select rule to test against:</p>

        <select
          className="rule-option-select"
          onChange={(e) => setSelectRule(e.target.value)}
        >
          {allRules.length > 0 &&
            allRules.map((data, index) => {
              return (
                <option className="rule-option-item" key={index}>
                  Rule {index + 1}
                </option>
              );
            })}
        </select>

        <p>Enter data:</p>
        <input
          placeholder='eg. {"age": 24, "department: "IT", "salary": 20000}'
          className="rule-input"
          value={data}
          type="textarea"
          onChange={(e) => setData(e.target.value)}
        />
        <br />

        <button className="btn" onClick={(e) => handleEvaluate(e)}>
          Evaluate
        </button>
      </div>
    </div>
  );
};

export default Home;
