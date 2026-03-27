import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import {
  LayoutDashboard,
  BookOpen,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/modules', icon: BookOpen, label: 'Modules' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { darkMode, toggleDarkMode } = useAppStore();
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.2 }}
      className="fixed left-0 top-0 h-screen sidebar-gradient border-r border-sidebar-border flex flex-col z-50"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sidebar-foreground font-semibold text-sm tracking-tight"
          >
            LabAssess
          </motion.span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-2">
        <button
          onClick={toggleDarkMode}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
        >
          {darkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
          {!collapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 shrink-0" />
          ) : (
            <ChevronLeft className="w-5 h-5 shrink-0" />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
