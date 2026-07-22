import crypto from "crypto";

export function generateSetupToken(): string {
    //Generates 32 random bytes.(Example ) 4A 9F 23 B1 ... 
  return crypto.randomBytes(32).toString("hex");
}