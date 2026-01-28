# **App Name**: LexFlow Workspace

## Core Features:

- Google Workspace Authentication: Authenticate users via Google OAuth, restricting access to the specified corporate domain and assigning roles (admin, lawyer, financial) for RBAC.
- Client Management: Enable CRUD operations for clients, automatically creating a dedicated folder in Google Drive with subfolders for Processes, Contracts, Documents, and Financials. A Google Sheet is created and linked to each client. Store Google Drive folder and sheet IDs in the database.
- Process Management: Manage legal processes, linking them to specific clients and creating subfolders within the client's Google Drive folder to store related documents. Track process milestones and updates.
- Hearing Scheduling: Schedule and manage court hearings, linking them to specific processes and recording details such as dates, locations, and responsible parties.
- Financial Transactions: Track accounts payable, accounts receivable, fees, settlements, and payments related to legal cases. Generate basic reports and export data to Google Sheets for backup and auditing.
- Configuration & Audit: Manage user permissions and Google Workspace integrations. Maintain audit logs for sensitive actions to ensure security and compliance.

## Style Guidelines:

- Primary color: Deep blue (#1E3A8A) to convey trust, professionalism, and security, reflecting the legal context of the application.
- Background color: Light blue-gray (#F0F4F8), a desaturated version of the primary, providing a calm, neutral backdrop for content.
- Accent color: Soft green (#84CC16), an analogous hue to the primary color, used to highlight key actions and important information.
- Body font: 'PT Sans', a modern sans-serif typeface for body text; it combines a contemporary look with warmth, ensuring readability and clarity.
- Headline font: 'Playfair', a modern sans-serif typeface for headlines; its elegant, fashionable lines complement the PT Sans body text.
- Use minimalist, professional icons relevant to legal processes, documents, and financial transactions, ensuring clarity and ease of use.
- Design a clean, responsive dashboard layout that adapts to various screen sizes, providing a consistent user experience across devices.
- Implement subtle animations to provide feedback on user interactions, such as loading indicators or confirmation messages, enhancing the app's usability.