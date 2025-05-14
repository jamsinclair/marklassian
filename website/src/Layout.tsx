import { FileJson2, Github } from "lucide-react";
import { NavLink, Outlet } from "react-router";

function getLinkClasses({ isActive }: { isActive?: boolean }) {
  return isActive
    ? "text-gray-900 font-semibold"
    : "text-gray-600 hover:text-gray-900";
}

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between sm:flex-row flex-col">
          <div className="flex items-center space-x-2">
            <FileJson2 className="h-6 w-6 text-blue-600 sm:block hidden" />
            <h1 className="text-xl font-semibold text-gray-900">
              Marklassian | Markdown to ADF Converter
            </h1>
          </div>
          <div className="flex items-center space-x-6 sm:mt-0 mt-4">
            <nav>
              <ul className="flex space-x-6">
                <li>
                  <NavLink to="/" className={getLinkClasses}>
                    API Reference
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/playground" className={getLinkClasses}>
                    Playground
                  </NavLink>
                </li>
              </ul>
            </nav>
            <a
              href="https://github.com/jamsinclair/marklassian"
              className="text-gray-600 hover:text-gray-900 flex items-center space-x-1"
            >
              <Github className="h-5 w-5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="bg-white shadow-sm mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>
            Created by{" "}
            <a
              href="https://github.com/jamsinclair"
              className="text-blue-600 hover:text-blue-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              jamsinclair
            </a>
            {" | "}
            <a
              href="https://github.com/jamsinclair/marklassian"
              className="text-blue-600 hover:text-blue-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source Code
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
