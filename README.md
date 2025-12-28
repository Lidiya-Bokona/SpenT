# SpenT - Time is Money

![SpenT Logo](https://via.placeholder.com/150x150?text=SpenT)

**SpenT** is a revolutionary productivity application that reimagines time management by treating time as a currency. In SpenT, every second is a dollar. You start each day with **$86,400** (representing the seconds in a 24-hour day), and your goal is to "invest" this capital wisely into productive tasks rather than letting it go to "waste".

---

## 🚀 Features

-   **Time = Currency Logic**: Experience a unique metabolic shift in how you view time. 1 Second = $1.
-   **Real-time Dashboard**: Watch your daily budget of $86,400 tick down in real-time.
-   **Investment Tracking**: Log tasks as **Investments** (Good), **Neutral**, or **Waste** (Bad).
-   **Financial Analytics**: Visualize your time usage with financial metaphors—view your "Portfolio Mix" and "Daily P&L".
-   **Smart Routines**: Automatically deduct fixed costs (Sleep, Meals) to see your true disposable income.
-   **PDF Reports**: Export professional reports of your time expenditure for accountability.
-   **Cross-Platform**: Fully responsive design works seamlessly on Desktop, Tablet, and Mobile.

## 🛠️ Tech Stack

**Frontend**
-   HTML5, CSS3 (Vanilla & Glassmorphism UI)
-   JavaScript (ES6+)
-   Chart.js for Analytics
-   FullCalendar for History

**Backend**
-   Python (Flask)
-   SQLAlchemy (ORM)
-   Flask-Login (Authentication)
-   WeasyPrint (PDF Generation)

**Database**
-   MySQL

## 📦 Installation & Setup

Follow these steps to get SpenT running on your local machine.

### Prerequisites
-   Python 3.8 or higher
-   MySQL Server installed and running

### Steps

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/spent.git
    cd spent
    ```

2.  **Set up Virtual Environment**
    ```bash
    # Windows
    python -m venv venv
    venv\Scripts\activate

    # macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Database**
    -   Create a MySQL database named `spent_db`.
    -   Update `backend/config.py` with your database credentials:
        ```python
        SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:yourpassword@localhost/spent_db'
        ```

5.  **Run the Application**
    ```bash
    cd backend
    python app.py
    ```
    The application will be available at `http://localhost:5000`.

## 🌐 Deployment

### Netlify / Platform.sh / Heroku
This application is correctly structured for deployment.
-   **Procfile** is included for Gunicorn deployment.
-   Ensure you set environment variables for `SECRET_KEY` and `SQLALCHEMY_DATABASE_URI` in your hosting provider.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Invest your time wisely.*
