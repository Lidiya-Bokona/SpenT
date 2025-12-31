# SpenT - Time is Money

SpenT is a web application that helps you track your time like money. Every second spent is a dollar counted. Start every day with $86,400 (representing seconds in a day) and invest it wisely in tasks, or watch it go to waste.

## Features
- **Time = Currency**: 1 second = $1.
- **Real-time Dashboard**: Live countdown of your daily budget.
- **Task Money Tracking**: Tasks are "purchased" with time. Good tasks are investments; Bad tasks or untracked time are wasted.
- **Auto-Routines**: Daily routines (Sleep, Meals) are automatically added to your day.
- **Analytics**: Visualize your "Investment Portfolio" (Invested vs Wasted) with interactive charts.
- **Calendar**: View your history of days and investments.
- **PDF Export**: Download a report of your tasks.
- **Dark & Gold Theme**: A premium, professional aesthetic.

## Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript, Chart.js, FullCalendar.
- **Backend**: Python (Flask), SQLAlchemy.
- **Database**: MySQL.
- **PDF Generation**: WeasyPrint.

## Setup Instructions

### Prerequisites
- Python 3.8+
- MySQL Server
- GTK3 (for WeasyPrint on Windows) - *Optional, PDF export will fail gracefully without it.*

### Installation

1.  **Clone the repository/Download source**.

2.  **Create and Activate Virtual Environment**:
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # Mac/Linux
    source venv/bin/activate
    ```

3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Database Setup**:
    -   Log in to MySQL and create the database:
        ```sql
        CREATE DATABASE spent_db;
        ```
    -   Update `backend/config.py` (if it exists) or `app.py` with your database credentials.
        *Default expectation:* `mysql+pymysql://root:password@localhost/spent_db`
    -   Run the application to auto-generate tables:
        ```bash
        cd backend
        python app.py
        ```
        *(The app automatically calls `db.create_all()` on startup).*

5.  **Run the Application**:
    ```bash
    cd backend
    python app.py
    ```
    Access the app at `http://127.0.0.1:5000`.

## Usage
1.  **Sign Up** to create an account.
2.  **Dashboard**: Watch your $86,400 tick away.
3.  **Add Tasks**: Log what you are doing. Mark them as "Good" (Investment) or "Bad" (Waste).
4.  **Review**: Check the Analytics tab to see if you are profitable with your time.

## Project Structure
-   `backend/`: Flask application logic (routes, models).
-   `frontend/templates/`: HTML templates.
-   `frontend/static/`: CSS, JS, and images.
-   `schema.sql`: Database reference.
