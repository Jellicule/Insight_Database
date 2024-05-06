# Campus Explorer

### [Demo Video](https://youtu.be/TwYjdNFZx4s)

This project provides a REST API for managing section and room datasets as well as making queries on the saved data. The included web app allows the user to find out information about the rooms their classes are in as well as the walking times and routes to take when going between their classes.

## Backend Setup

1. Clone the repository or navigate to the directory containing it

    ```bash
    git clone https://github.students.cs.ubc.ca/CPSC310-2023W-T2/project_team194
    ```

2. Navigate to the backend directory

    ```bash
    cd project_team194
    ```

3. Install dependencies

    ```bash
    yarn install
    ```

4. Start the backend server

    ```bash
    yarn start
    ```

## Frontend Setup

1. Clone the repository or navigate to the directory containing it

    ```bash
    git clone https://github.students.cs.ubc.ca/CPSC310-2023W-T2/project_team194
    ```

2. Navigate to the frontend directory

    ```bash
    cd project_team194/frontend
    ```

3. Install dependencies

    ```bash
    yarn install
    ```

4. Create a `.env.local` file with your MapKit JS JWT (If a TA requires a token please contact me so I can generate a temporary one and share it privately)

    ```env
    VITE_MAPKIT_TOKEN="your_mapkit_token_here"
    ```

5. Start the dev server and navigate to `localhost:5173` in your browser

    ```bash
    yarn dev
    ```
