import { z } from "zod";

export const choiceSchema = z.object({
  name: z.string().trim().min(1, "Nom du choix requis.").max(60),
  priceDeltaCents: z.number().int().min(-100000).max(100000),
  available: z.boolean().default(true),
});

export const groupSchema = z
  .object({
    name: z.string().trim().min(1, "Nom du groupe requis.").max(60),
    type: z.enum(["single", "multiple"]),
    required: z.boolean().default(false),
    minSelections: z.number().int().min(0).max(20).default(0),
    maxSelections: z.number().int().min(1).max(20).default(1),
    choices: z.array(choiceSchema).min(1, "Ajoutez au moins un choix.").max(40),
  })
  .superRefine((value, ctx) => {
    if (value.type === "single" && value.maxSelections !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Un choix unique doit avoir un maximum de 1.",
        path: ["maxSelections"],
      });
    }
    if (value.minSelections > value.maxSelections) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le minimum ne peut pas dépasser le maximum.",
        path: ["minSelections"],
      });
    }
    if (value.required && value.minSelections < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Un groupe obligatoire doit demander au moins un choix.",
        path: ["minSelections"],
      });
    }
  });

