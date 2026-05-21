import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Employee, EmployeeSchema } from "@/lib/schemas/employee";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.employeeId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = await getDb();
    const employee = await db.collection<Employee>("employees").findOne({ id: user.employeeId });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Failed to fetch employee profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.employeeId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = await getDb();
    const body = await request.json();

    // Validate and sanitize the input
    const { id, created_at, updated_at, ...updateData } = body;
    const validatedData = EmployeeSchema.partial().strip().parse(updateData);

    const result = await db.collection<Employee>("employees").findOneAndUpdate(
      { id: user.employeeId },
      { $set: { ...validatedData, updated_at: new Date() } },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return NextResponse.json({ error: "Employee not found or update failed" }, { status: 404 });
    }

    return NextResponse.json(result.value);
  } catch (error) {
    console.error("Failed to update employee profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}