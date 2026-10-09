import { z } from "zod";

export const cardLabelSchema = z
  .string()
  .trim()
  .max(60, "Card names can be at most 60 characters.")
  .transform((v) => (v === "" ? null : v));

export const cardDestinationSchema = z.enum(["PROFILE", "LINKEDIN"]);

export const claimCodeSchema = z
  .string()
  .trim()
  .min(1, "Enter the claim code from your card's packaging.")
  .max(20, "That doesn't look like a claim code. It's 10 letters and numbers, like ABCDE-23456.");
