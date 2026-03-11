import { type UserRole, type ClientStatus, type ProjectStatus, type ActionPriority, type ActionStatus } from "@prisma/client";

export type { UserRole, ClientStatus, ProjectStatus, ActionPriority, ActionStatus };

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Étend le type de session NextAuth
declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
  interface User {
    role: UserRole;
  }
}

// next-auth/jwt augmentation handled in auth.ts

// Types utilitaires
export type ActionStatusColor = {
  a_faire: "blue";
  en_cours: "yellow";
  termine: "green";
  bloque: "red";
};

export type PriorityColor = {
  basse: "blue";
  moyenne: "yellow";
  haute: "orange";
  urgente: "red";
};
