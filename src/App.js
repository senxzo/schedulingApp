import React, { useState, useEffect } from "react";
import "./tailwind.css";
import db, { updateDocument } from "./db";
import jsPDF from "jspdf";
import "jspdf-autotable"; // For table support in PDF
import Papa from "papaparse"; // For CSV export

function App() {
  const [shifts, setShifts] = useState([]);
  const [requiredWorkers, setRequiredWorkers] = useState({});
  const [employees, setEmployees] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [scheduleDays, setScheduleDays] = useState(0);
  const [businessOperatingDays, setBusinessOperatingDays] = useState(0);
  const [startDate, setStartDate] = useState(""); // State for start date
  const [generatedFiles, setGeneratedFiles] = useState([]); // State for generated files

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Load data from PouchDB on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const shiftsData = await db.get("shifts");
        setShifts(shiftsData.shifts);
      } catch (error) {
        console.log("No shifts data found, initializing...");
      }

      try {
        const employeesData = await db.get("employees");
        setEmployees(employeesData.employees);
      } catch (error) {
        console.log("No employees data found, initializing...");
      }
    };

    fetchData();
  }, []);

  // Add a new shift
  const addShift = async (shift) => {
    if (shift && !shifts.includes(shift)) {
      const newShifts = [...shifts, shift];
      setShifts(newShifts);
      await updateDocument("shifts", (doc) => ({
        ...doc,
        shifts: newShifts,
      }));
    }
  };

  // Set required workers for a shift
  const setWorkersForShift = async (shift, workers) => {
    const newRequiredWorkers = { ...requiredWorkers, [shift]: workers };
    setRequiredWorkers(newRequiredWorkers);
    await updateDocument("requiredWorkers", (doc) => ({
      ...doc,
      ...newRequiredWorkers,
    }));
  };

  // Add a new employee
  const addEmployee = async (employee) => {
    const newEmployees = [...employees, employee];
    setEmployees(newEmployees);
    await updateDocument("employees", (doc) => ({
      ...doc,
      employees: newEmployees,
    }));
  };

  // Remove an employee
  const removeEmployee = async (index) => {
    const newEmployees = employees.filter((_, i) => i !== index);
    setEmployees(newEmployees);
    await updateDocument("employees", (doc) => ({
      ...doc,
      employees: newEmployees,
    }));
  };

  // Edit an employee
  const editEmployee = async (index, updatedEmployee) => {
    const newEmployees = employees.map((employee, i) =>
      i === index ? updatedEmployee : employee
    );
    setEmployees(newEmployees);
    await updateDocument("employees", (doc) => ({
      ...doc,
      employees: newEmployees,
    }));
  };

  // Shuffle employees and regenerate the schedule
  // Generate the schedule
  const generateSchedule = () => {
    if (!startDate) {
      alert("Please enter a start date.");
      return;
    }

    // Shuffle the employees array
    const shuffledEmployees = [...employees].sort(() => Math.random() - 0.5);

    const generatedSchedule = [];
    let currentDayIndex = 0;

    // Reset remaining days for all employees
    const updatedEmployees = shuffledEmployees
      .map((employee) => ({
        ...employee,
        remainingDays: employee.workingDays,
        shiftsAssignedThisWeek: 0, // Track shifts assigned per week
        shiftsAssignedLastWeek: 0, // Track shifts assigned in the previous week
        lastShift: null, // Track the last shift assigned to the employee
      }))
      .sort((a, b) => a.specializations.length - b.specializations.length); // Sort by number of specializations

    // When getting the start date (assuming you're getting it from a form input)
    const start = new Date(startDate + "T00:00:00"); // Add time to ensure local date

    // Then in your loop
    for (let day = 0; day < scheduleDays; day++) {
      const currentDate = new Date(start); // Create a new date object from start date
      currentDate.setDate(start.getDate() + day); // Add the correct number of days

      // Create a mapping between JavaScript's getDay() and our daysOfWeek array
      const dayMapping = {
        0: "Sun", // Sunday
        1: "Mon",
        2: "Tue",
        3: "Wed",
        4: "Thu",
        5: "Fri",
        6: "Sat",
      };

      // Get the day name using the mapping
      const currentDay = dayMapping[currentDate.getDay()];

      const formattedDate = `${currentDay} (${currentDate.toLocaleDateString()})`;

      const daySchedule = {
        day: currentDay,
        date: formattedDate,
        shifts: {},
      };

      // Initialize shifts for the day
      shifts.forEach((shift) => {
        daySchedule.shifts[shift] = [];
      });

      // Track which employees have been assigned to a shift on this day
      const assignedEmployees = new Set();

      // Step 1: Assign shifts to staff with fewer specializations first
      updatedEmployees.forEach((employee) => {
        if (employee.remainingDays > 0) {
          // Try to assign shifts in order of their specializations
          employee.specializations.forEach((shift) => {
            if (
              employee.preferredDays.includes(currentDay) &&
              daySchedule.shifts[shift].length < requiredWorkers[shift] &&
              !assignedEmployees.has(employee.name)
            ) {
              daySchedule.shifts[shift].push(employee.name);
              assignedEmployees.add(employee.name);
              employee.remainingDays--;
              employee.shiftsAssignedThisWeek++;
              employee.lastShift = shift; // Update the last shift assigned
            }
          });
        }
      });

      generatedSchedule.push(daySchedule);

      // Move to the next day
      currentDayIndex = (currentDayIndex + 1) % businessOperatingDays;

      // Check if a new week has started
      if (currentDayIndex === 0) {
        // Update shiftsAssignedLastWeek for all employees
        updatedEmployees.forEach((employee) => {
          employee.shiftsAssignedLastWeek = employee.shiftsAssignedThisWeek;
          employee.shiftsAssignedThisWeek = 0;
          employee.remainingDays = employee.workingDays;
          employee.lastShift = null; // Reset last shift at the start of a new week
        });
      }
    }

    setSchedule(generatedSchedule);
  };

  // Transform schedule data for PDF/CSV export
  const transformScheduleData = () => {
    const transformedData = [];

    // Create a map of employees and their shifts
    employees.forEach((employee) => {
      const employeeShifts = { Name: employee.name };

      schedule.forEach((daySchedule) => {
        const shiftAssigned = shifts.find((shift) =>
          daySchedule.shifts[shift].includes(employee.name)
        );
        employeeShifts[daySchedule.date] = shiftAssigned || "Off";
      });

      transformedData.push(employeeShifts);
    });

    return transformedData;
  };

  // Export schedule as PDF
  const exportToPDF = () => {
    const doc = new jsPDF("landscape"); // Use landscape orientation

    // Add a title to the PDF
    doc.setFontSize(14);
    doc.text("Staff Schedule", 14, 22);

    // Transform the schedule data
    const transformedData = transformScheduleData();

    // Define the columns for the table
    const columns = ["Name", ...schedule.map((day) => day.date)];

    // Prepare the data for the table
    const rows = transformedData.map((employee) => {
      const row = [employee.Name];
      schedule.forEach((day) => {
        row.push(employee[day.date]);
      });
      return row;
    });

    // Generate the table using autoTable
    doc.autoTable({
      startY: 30, // Start the table below the title
      head: [columns],
      body: rows,
      theme: "grid", // Add grid lines for better readability
      styles: { cellPadding: 5, fontSize: 10 }, // Adjust cell padding and font size
      columnStyles: {
        0: { cellWidth: 30 }, // Adjust the width of the "Name" column
        // Adjust the width of date columns dynamically
        ...Object.fromEntries(
          schedule.map((_, index) => [index + 1, { cellWidth: 30 }])
        ),
      },
    });

    // Generate file name with current date
    const dateNow = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const fileName = `staff_schedule_${dateNow}.pdf`;

    // Save the PDF
    doc.save(fileName);

    // Persist the file in state
    setGeneratedFiles((prevFiles) => [
      ...prevFiles,
      { name: fileName, type: "pdf", date: new Date().toLocaleString() },
    ]);
  };

  // Export schedule as CSV
  const exportToCSV = () => {
    const transformedData = transformScheduleData();

    const csv = Papa.unparse(transformedData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    // Generate file name with current date
    const dateNow = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const fileName = `staff_schedule_${dateNow}.csv`;

    // Create a download link
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();

    // Persist the file in state
    setGeneratedFiles((prevFiles) => [
      ...prevFiles,
      { name: fileName, type: "csv", date: new Date().toLocaleString() },
    ]);
  };

  // Delete a generated file
  const deleteFile = (fileName) => {
    setGeneratedFiles((prevFiles) =>
      prevFiles.filter((file) => file.name !== fileName)
    );
  };

  return (
    <div className="App p-8 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8">
        Staff Scheduling App
      </h1>

      {/* Step 1: Define Shifts */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold mb-4">Step 1: Define Shifts</h2>
        <ShiftForm addShift={addShift} />
        <ShiftList shifts={shifts} setWorkersForShift={setWorkersForShift} />
      </div>

      {/* Step 2: Add Employees */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold mb-4">Step 2: Add Employees</h2>
        <EmployeeForm
          addEmployee={addEmployee}
          shifts={shifts}
          daysOfWeek={daysOfWeek}
        />
        <EmployeeList
          employees={employees}
          removeEmployee={removeEmployee}
          editEmployee={editEmployee}
        />
      </div>

      {/* Step 3: Generate Schedule */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          Step 3: Generate Schedule
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Start Date:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Number of days to schedule:
            </label>
            <input
              type="number"
              value={scheduleDays || ""}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setScheduleDays(isNaN(value) ? 0 : value);
              }}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Business operating days per week:
            </label>
            <input
              type="number"
              value={businessOperatingDays || ""}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setBusinessOperatingDays(isNaN(value) ? 0 : value);
              }}
              className="w-full p-2 border rounded"
            />
          </div>
          <button
            onClick={generateSchedule}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Generate Schedule
          </button>
        </div>
      </div>

      {/* Display Schedule */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Generated Schedule</h2>
        <ScheduleTable schedule={schedule} />
        <div className="mt-4 space-x-4">
          <button
            onClick={exportToPDF}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Export to PDF
          </button>
          <button
            onClick={exportToCSV}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Export to CSV
          </button>
        </div>
      </div>

      {/* Display Generated Files */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-8">
        <h2 className="text-2xl font-semibold mb-4">Generated Files</h2>
        <ul className="space-y-2">
          {generatedFiles.map((file, index) => (
            <li key={index} className="flex items-center justify-between">
              <span>
                {file.name} - {file.date}
              </span>
              <button
                onClick={() => deleteFile(file.name)}
                className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Shift Form Component
function ShiftForm({ addShift }) {
  const [shift, setShift] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (shift) {
      addShift(shift);
      setShift("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <input
        type="text"
        placeholder="Enter a shift (e.g., ER Nurse)"
        value={shift}
        onChange={(e) => setShift(e.target.value)}
        className="w-full p-2 border rounded"
      />
      <button
        type="submit"
        className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Add Shift
      </button>
    </form>
  );
}

// Shift List Component
function ShiftList({ shifts, setWorkersForShift }) {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Shifts</h3>
      <ul className="space-y-2">
        {shifts.map((shift, index) => (
          <li key={index} className="flex items-center justify-between">
            <span className="font-medium">{shift}</span>
            <input
              type="number"
              placeholder="Workers needed"
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setWorkersForShift(shift, isNaN(value) ? 0 : value);
              }}
              className="w-24 p-2 border rounded"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// Employee Form Component
function EmployeeForm({ addEmployee, shifts, daysOfWeek }) {
  const [name, setName] = useState("");
  const [specializations, setSpecializations] = useState([]);
  const [workingDays, setWorkingDays] = useState(0);
  const [preferredDays, setPreferredDays] = useState([]);

  const handleSpecializationChange = (shift) => {
    if (specializations.includes(shift)) {
      setSpecializations(specializations.filter((s) => s !== shift));
    } else {
      setSpecializations([...specializations, shift]);
    }
  };

  const handlePreferredDaysChange = (day) => {
    if (preferredDays.includes(day)) {
      setPreferredDays(preferredDays.filter((d) => d !== day));
    } else {
      setPreferredDays([...preferredDays, day]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (
      name &&
      specializations.length > 0 &&
      workingDays > 0 &&
      preferredDays.length > 0
    ) {
      addEmployee({
        name,
        specializations,
        workingDays,
        preferredDays,
        remainingDays: workingDays,
      });
      setName("");
      setSpecializations([]);
      setWorkingDays(0);
      setPreferredDays([]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Employee Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-2 border rounded"
      />
      <div>
        <h4 className="text-lg font-semibold mb-2">Specializations</h4>
        <div className="grid grid-cols-2 gap-2">
          {shifts.map((shift, index) => (
            <label key={index} className="flex items-center space-x-2">
              <input
                type="checkbox"
                value={shift}
                checked={specializations.includes(shift)}
                onChange={() => handleSpecializationChange(shift)}
                className="form-checkbox"
              />
              <span>{shift}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-lg font-semibold mb-2">Preferred Days</h4>
        <div className="grid grid-cols-3 gap-2">
          {daysOfWeek.map((day, index) => (
            <label key={index} className="flex items-center space-x-2">
              <input
                type="checkbox"
                value={day}
                checked={preferredDays.includes(day)}
                onChange={() => handlePreferredDaysChange(day)}
                className="form-checkbox"
              />
              <span>{day}</span>
            </label>
          ))}
        </div>
      </div>
      <input
        type="number"
        placeholder="Working Days per Week"
        value={workingDays || ""}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          setWorkingDays(isNaN(value) ? 0 : value);
        }}
        className="w-full p-2 border rounded"
      />
      <button
        type="submit"
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Add Employee
      </button>
    </form>
  );
}

// Employee List Component
function EmployeeList({ employees, removeEmployee, editEmployee }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedEmployee, setEditedEmployee] = useState({});

  const handleEditClick = (index, employee) => {
    setEditingIndex(index);
    setEditedEmployee(employee);
  };

  const handleSaveClick = async (index) => {
    await editEmployee(index, editedEmployee);
    setEditingIndex(null);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Employees</h3>
      <ul className="space-y-2">
        {employees.map((employee, index) => (
          <li key={index} className="bg-gray-50 p-3 rounded">
            {editingIndex === index ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editedEmployee.name}
                  onChange={(e) =>
                    setEditedEmployee({
                      ...editedEmployee,
                      name: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded"
                />
                <div>
                  <h4 className="text-lg font-semibold mb-2">
                    Specializations
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {employee.specializations.map((shift, idx) => (
                      <label key={idx} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          value={shift}
                          checked={editedEmployee.specializations.includes(
                            shift
                          )}
                          onChange={() => {
                            const newSpecializations =
                              editedEmployee.specializations.includes(shift)
                                ? editedEmployee.specializations.filter(
                                    (s) => s !== shift
                                  )
                                : [...editedEmployee.specializations, shift];
                            setEditedEmployee({
                              ...editedEmployee,
                              specializations: newSpecializations,
                            });
                          }}
                          className="form-checkbox"
                        />
                        <span>{shift}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2">Preferred Days</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {employee.preferredDays.map((day, idx) => (
                      <label key={idx} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          value={day}
                          checked={editedEmployee.preferredDays.includes(day)}
                          onChange={() => {
                            const newPreferredDays =
                              editedEmployee.preferredDays.includes(day)
                                ? editedEmployee.preferredDays.filter(
                                    (d) => d !== day
                                  )
                                : [...editedEmployee.preferredDays, day];
                            setEditedEmployee({
                              ...editedEmployee,
                              preferredDays: newPreferredDays,
                            });
                          }}
                          className="form-checkbox"
                        />
                        <span>{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  value={editedEmployee.workingDays}
                  onChange={(e) =>
                    setEditedEmployee({
                      ...editedEmployee,
                      workingDays: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={() => handleSaveClick(index)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-medium">{employee.name}</span> (
                {employee.specializations.join(", ")}) - {employee.workingDays}{" "}
                days/week
                <div>
                  <button
                    onClick={() => handleEditClick(index, employee)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeEmployee(index)}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 ml-2"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Schedule Table Component
function ScheduleTable({ schedule }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border rounded-lg">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left">Day</th>
            {Object.keys(schedule[0]?.shifts || {}).map((shift, index) => (
              <th key={index} className="p-3 text-left">
                {shift}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {schedule.map((daySchedule, index) => (
            <tr key={index} className="border-b">
              <td className="p-3 font-medium">{daySchedule.day}</td>
              {Object.values(daySchedule.shifts).map((workers, idx) => (
                <td key={idx} className="p-3">
                  {workers.join(", ")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
