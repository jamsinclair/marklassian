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
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileJson2 className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">
              Marklassian | Markdown to ADF Converter
            </h1>
          </div>
          <div className="flex items-center space-x-6">
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
    </div>
  );
}

export default Layout;
