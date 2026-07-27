# Data Quality Auditor

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Recharts](https://img.shields.io/badge/recharts-%2322B573.svg?style=for-the-badge&logo=react&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)

A fast, client-side, and enterprise-grade data profiling and quality assessment tool built for Data Analysts and Engineers. Data Quality Auditor allows users to upload datasets and instantly generate comprehensive data quality reports, statistical profiles, and actionable recommendations directly in the browser.

---

## Live Demo

[Link to Live Demo (Placeholder)](#)

---

## Screenshots

*(Add screenshots of the upload interface, main dashboard, column profiling, and dataset explorer here)*

---

## Features

*   **Instant Profiling**: Generates summary statistics and data quality metrics immediately upon upload.
*   **100% Client-Side Processing**: Data never leaves your machine. All parsing and analysis are performed securely within the browser.
*   **Comprehensive Data Quality Checks**: Automatically detects missing values, duplicate rows, outliers, and invalid date formats.
*   **Actionable Recommendations**: Provides prioritized suggestions for cleaning and improving the dataset.
*   **Interactive Dashboard**: Explores data through visual charts, statistical summaries, and an interactive data table.
*   **Export Capabilities**: Export the final data quality report as a PDF, JSON, or copy it to the clipboard.

## Tech Stack

*   **Frontend**: React (v18+), Vite
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **Data Visualization**: Recharts
*   **File Parsing**: PapaParse (CSV), SheetJS (Excel)
*   **Animation**: Framer Motion
*   **Icons**: Lucide React

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/data-quality-auditor.git
    cd data-quality-auditor
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Running Locally

To start the development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

To build the application for production:

```bash
npm run build
```

## Folder Structure

```
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable React components (UploadArea, Dashboard, etc.)
│   ├── lib/                # Core analysis logic and utilities (analyzer.ts)
│   ├── App.tsx             # Main application component
│   ├── index.css           # Global Tailwind CSS styles
│   ├── main.tsx            # Application entry point
│   └── types.ts            # TypeScript interfaces and types
├── index.html              # HTML template
├── package.json            # Project metadata and dependencies
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration
```

## Performance Optimizations

*   **Chunked Processing**: The data analyzer (`analyzer.ts`) utilizes asynchronous chunking with `yieldToMain` (setTimeout) to prevent main thread blocking and UI freezing when processing datasets up to 100,000+ rows.
*   **Memoization**: Extensive use of `useMemo` and `useCallback` to prevent unnecessary re-renders in large data tables and charts.
*   **Debounced Interactions**: Search functionality in the Data Table is debounced to maintain responsiveness.
*   **DOM Virtualization / Pagination**: The data explorer limits rendered DOM elements via client-side pagination.
*   **Responsive State Handling**: Animations scale gracefully without causing expensive layout thrashing.

## Supported File Formats

*   `.csv` (Comma Separated Values)
*   `.xlsx`, `.xls` (Microsoft Excel)

## Quality Checks Performed

The auditor evaluates the following dimensions of data quality:

*   **Completeness**: Detection of missing/null values across all columns.
*   **Uniqueness**: Identification of exact duplicate rows and column cardinality (unique values).
*   **Validity**: Detection of invalid date formats and data type inference.
*   **Accuracy / Outliers**: Statistical detection of outliers in numeric columns using the Interquartile Range (IQR) method.
*   **Consistency**: Identification of constant columns (single unique value).

## Future Roadmap

*   Support for larger-than-memory datasets via Web Workers.
*   Integration with Parquet file formats.
*   Advanced schema validation against user-defined rules.
*   Data cleaning tools (e.g., auto-impute missing values, drop duplicates).
*   Database connection support for direct table profiling.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**[Your Name / Username]**

*   Website: [Your Portfolio](#)
*   Twitter: [@yourhandle](#)
*   GitHub: [@yourusername](#)
