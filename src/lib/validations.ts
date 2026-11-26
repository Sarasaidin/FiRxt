import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().or(z.literal("")),
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

const partnerRegisterBaseSchema = z.object({
  // Account details (required for new account registration)
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Must include at least 1 uppercase letter")
    .regex(/[a-z]/, "Must include at least 1 lowercase letter")
    .regex(/[0-9]/, "Must include at least 1 number")
    .regex(/[^A-Za-z0-9]/, "Must include at least 1 special character"),
  phone: z.string().trim().min(10, "Enter a valid phone number"),

  // Business
  businessName: z.string().trim().min(2, "Business name must be at least 2 characters"),
  businessSsmNumber: z.string().trim().regex(/^\d{12}$/, "SSM number must contain exactly 12 digits"),
  type: z.enum(["PHARMACY", "CLINIC"]),
  businessPhone: z.string().trim().min(10, "Enter a valid business phone number"),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  description: z.string().optional(),

  // Location
  addressLine1: z.string().trim().min(5, "Address must be at least 5 characters"),
  addressLine2: z.string().optional(),
  city: z.string().trim().min(2, "City must be at least 2 characters"),
  state: z.string().trim().min(2, "State must be at least 2 characters"),
  postcode: z.string().trim().min(4, "Enter a valid postcode"),
  latitude: z.number().finite().min(-90).max(90).nullable(),
  longitude: z.number().finite().min(-180).max(180).nullable(),
});

const validatePartnerCoordinates = (
  data: { latitude: number | null; longitude: number | null },
  ctx: z.RefinementCtx
) => {
  if ((data.latitude === null) !== (data.longitude === null)) {
    ctx.addIssue({
      code: "custom",
      message: "Latitude and longitude must both be provided or both be empty.",
      path: ["latitude"],
    });
  }
};

export const partnerRegisterSchema =
  partnerRegisterBaseSchema.superRefine(validatePartnerCoordinates);

export const existingPartnerRegisterSchema =
  partnerRegisterBaseSchema
    .omit({
      name: true,
      password: true,
      phone: true,
    })
    .superRefine(validatePartnerCoordinates);


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


export const labTestSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Test code must be at least 2 characters")
    .max(50, "Test code cannot exceed 50 characters")
    .regex(
      /^[A-Z0-9][A-Z0-9_-]*$/,
      "Test code may only contain letters, numbers, underscores and hyphens"
    ),

  name: z
    .string()
    .trim()
    .min(2, "Test name must be at least 2 characters")
    .max(120, "Test name cannot exceed 120 characters"),

  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),

  category: z
    .string()
    .trim()
    .max(100, "Category cannot exceed 100 characters")
    .optional(),
}).strict();

export const labTestUpdateSchema = labTestSchema
  .partial()
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided"
  );


const bloodTestPackageFields = {
  name: z.string().trim()
    .min(2, "Package name must be at least 2 characters")
    .max(120, "Package name cannot exceed 120 characters"),

  description: z.string().trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),

  price: z.number().int()
    .positive("Price must be positive")
    .max(Number.MAX_SAFE_INTEGER),

  originalPrice: z.number().int()
    .positive("Original price must be positive")
    .max(Number.MAX_SAFE_INTEGER)
    .optional(),

  preparationInstructions: z.string().trim()
    .max(5000, "Preparation instructions cannot exceed 5000 characters")
    .optional(),

  sampleType: z.string().trim()
    .max(100, "Sample type cannot exceed 100 characters")
    .optional(),

  turnaroundDays: z.number().int()
    .positive("Turnaround days must be positive")
    .max(365)
    .optional(),

  visibility: z.enum(["PRIVATE", "SHARED"]),

  labTestIds: z.array(
    z.string().trim().min(1, "Laboratory test ID cannot be empty")
  )
    .min(1, "Select at least one laboratory test")
    .max(100, "A package cannot contain more than 100 tests")
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Duplicate laboratory tests are not allowed"
    ),
};

export const bloodTestPackageSchema = z
  .object(bloodTestPackageFields)
  .strict()
  .refine(
    (data) =>
      data.originalPrice === undefined ||
      data.originalPrice > data.price,
    {
      message: "Original price must be greater than package price",
      path: ["originalPrice"],
    }
  );

export const bloodTestPackageUpdateSchema = z
  .object(bloodTestPackageFields)
  .partial()
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided"
  )
  .refine(
    (data) =>
      data.originalPrice === undefined ||
      data.price === undefined ||
      data.originalPrice > data.price,
    {
      message: "Original price must be greater than package price",
      path: ["originalPrice"],
    }
  );
