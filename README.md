# Staff Scheduling App

## Overview

The **Staff Scheduling App** is a web-based application that allows businesses to efficiently manage and generate employee shift schedules. The app enables users to define shifts, add employees with their availability and specializations, and automatically generate a fair and balanced schedule. It also includes export functionality to **PDF** and **CSV** formats for easy sharing and record-keeping.

## Features

- **Define Work Shifts**: Create and manage different shift types.
- **Manage Employees**: Add, edit, and remove employees with their working preferences.
- **Auto-Generate Schedule**: Automatically create an optimal schedule based on employee preferences and required workers per shift.
- **Export Schedule**: Download schedules as **PDF** and **CSV** files.
- **Local Storage with PouchDB**: Saves shift and employee data persistently in the browser.

## Technologies Used

- **React**: For building the UI and managing state.
- **PouchDB**: Local storage for shifts and employee data.
- **Tailwind CSS**: For styling.
- **jsPDF & autoTable**: For PDF export.
- **PapaParse**: For CSV export.

## Installation & Setup

### Prerequisites

Ensure you have the following installed on your system:

- **Node.js** (v14+ recommended)
- **npm** or **yarn**

### Steps

1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo/staff-scheduling-app.git
   cd staff-scheduling-app
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the development server:
   ```sh
   npm start
   ```
4. Open the application in your browser at `http://localhost:3000/`.

## Usage

1. **Define Work Shifts**: Enter shift names (e.g., "ER Nurse I", "Handyman II, Janitor") and specify the required number of workers. for this demo, we use D00n to D4 to represent day shifts and E1 to E3 for evening shifts
  <img width="1436" alt="Screenshot 2025-03-05 at 1 16 21 PM" src="https://github.com/user-attachments/assets/72411c39-b38b-4148-9a3c-96f19f6ed6d9" />


2. **Add Employees** : Provide employee names, select their available working days, and assign their specializations. Some workers may have more than one specialization for example some staffs may work both day and evening shifts, a handyman may also do the gardner shift. So select shifts according to the order of preferrence as the app will take this into consideration when assigning shifts, for example, select day shifts first for users who prefer the day shift. Also select working days according to preference as some workers may prefer working on the weekends more than weekdays.
 <img width="1415" alt="Screenshot 2025-03-05 at 1 18 27 PM" src="https://github.com/user-attachments/assets/53d4616d-ca5f-432b-8279-c350454f237e" />


3. **View/Edit workers** edit workers details accordingly
   <img width="1394" alt="Screenshot 2025-03-05 at 1 19 00 PM" src="https://github.com/user-attachments/assets/a5c45953-2f44-48cb-bae2-7ada7ddeb757" />


4. **Generate Schedule**: Select the start date of the schedule, number of days to schedule and the number of business days, this option is included because some business operate 7days a week while some just Monday to Friday. Click the "Generate Schedule" button to create a shift plan based on the input data.
 <img width="1393" alt="Screenshot 2025-03-05 at 1 19 42 PM" src="https://github.com/user-attachments/assets/5832614b-5ab8-4b34-94bc-0cbda498499e" />


5. **View Generated Schedule**
 <img width="1394" alt="Screenshot 2025-03-05 at 1 20 05 PM" src="https://github.com/user-attachments/assets/4242ffa5-c36a-4deb-a8a6-b56043cf3add" />


6. **Export the Schedule**: Download the schedule in PDF or CSV format for sharing. A sample of the schedule in csv
  <img width="1176" alt="Screenshot 2025-03-05 at 1 21 10 PM" src="https://github.com/user-attachments/assets/f0692013-ce55-4190-85ee-c5dc627ba700" />

## File Structure

```
├── src/
│   ├── App.js          # Main application component
│   ├── index.js        # Entry point of the application
│   ├── db.js           # Database configuration (PouchDB)
│   ├── components/     # Reusable components (ShiftForm, EmployeeForm, etc.)
│   ├── tailwind.css    # Tailwind CSS styles
│   ├── ...
├── public/
├── package.json
└── README.md
```

## Contributing

If you’d like to contribute to the project, feel free to fork the repository, create a feature branch, and submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

---

Happy scheduling! 🚀
