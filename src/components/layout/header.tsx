"use client";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { type SessionUser } from "@/types";
import { NotificationsBell } from "./notifications-bell";

interface HeaderProps {
  user: SessionUser;
  title?: string;
}

export function Header({ user, title }: HeaderProps) {
  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
      {/* Titre de page */}
      <div>
        {title && (
          <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        )}
      </div>

      {/* Actions droite */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationsBell />

        {/* User menu */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-none">{user.name}</p>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{user.role}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
