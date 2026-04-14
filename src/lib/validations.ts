import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must include at least 1 uppercase letter")
    .regex(/[a-z]/, "Must include at least 1 lowercase letter")
    .regex(/[0-9]/, "Must include at least 1 number")
    .regex(/[^A-Za-z0-9]/, "Must include at least 1 special character"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const partnerRegisterSchema = z.object({
  // Account
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must include at least 1 uppercase letter")
    .regex(/[a-z]/, "Must include at least 1 lowercase letter")
    .regex(/[0-9]/, "Must include at least 1 number")
    .regex(/[^A-Za-z0-9]/, "Must include at least 1 special character"),
  phone: z.string().min(10, "Enter a valid phone number"),

  // Business
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  type: z.enum(["PHARMACY", "CLINIC"]),
  businessEmail: z.string().email("Invalid business email").optional(),
  businessPhone: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  description: z.string().optional(),

  // Location
  addressLine1: z.string().min(5, "Address must be at least 5 characters"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().min(2, "State must be at least 2 characters"),
  postcode: z.string().min(5, "Postcode must be at least 5 characters"),
  latitude: z.number(),
  longitude: z.number(),
});

export const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  comparePrice: z.number().optional(),
  sku: z.string().optional(),
  stock: z.number().int().min(0),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  tags: z.array(z.string()).optional(),
  requiresPrescription: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  images: z.array(z.string()).optional(),
});

export const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  durationMinutes: z.number().int().positive().optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  images: z.array(z.string()).optional(),
});

export const promotionSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),
  discountValue: z.number().positive(),
  minOrderValue: z.number().optional(),
  maxDiscount: z.number().optional(),
  code: z.string().optional(),
  usageLimit: z.number().int().optional(),
  startDate: z.string(),
  endDate: z.string(),
  partnerId: z.string().optional(),
});