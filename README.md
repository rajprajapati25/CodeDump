<div align="center">
  <img src="assets/codedump_128x128.png" alt="CodeDump Icon" width="80" />
</div>

<h1 align="center">CodeDump</h1>

CodeDump is a personal file storage and management solution backed by a private GitHub repository. It allows you to seamlessly upload, pull, manage, and share your files in a beautifully designed user interface.

## 🌐 Live Demo
**[https://code-dump-snowy.vercel.app/](https://code-dump-snowy.vercel.app/)**

## 💻 Tech Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **Backend/Storage**: Node.js, Express, GitHub REST API
- **Deployment**: Vercel

## 🚀 How to Install

1. Clone the repository:
```bash
git clone https://github.com/rajprajapati2001/CodeDump.git
cd CodeDump
```

2. Install dependencies:
```bash
npm install
```

## ⚙️ Setup Environment Variables

To allow the application to securely store files, you need to provide your GitHub credentials and a target repository. 

Create a `.env` file in the root directory and add the following variables:
```env
GITHUB_TOKEN=your_personal_access_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_private_repository_name
```
*(Alternatively, you can configure these directly in the UI under **Setup Storage**.)*
*(For `npm run dev` as **Local Storage** use `.env.local` fileile.)*

## 🏃‍♂️ Run Locally

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## 📜 License
This project is open-source and available under the [MIT License](https://github.com/rajprajapati2001/CodeDump/blob/main/LICENSE).

---
**Raj Prajapati**

Developed on `03th June 2026`/`Wednesday`.
