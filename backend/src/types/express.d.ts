// Augments Express's Request.user (populated by passport) with our User shape.
declare namespace Express {
  interface User {
    id: string;
    googleId: string;
    email: string;
    name: string;
    avatar?: string | null;
  }
}
