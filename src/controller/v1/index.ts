import { error } from "console";
import { createSchoolTable } from "../../data/sqlQuery";
import { query } from "../../lib/db";
import { Request, Response, NextFunction } from "express";

export const createSchoolService = async (req: Request, res: Response) => {
  try {
    // Execute the SQL query to create the school table
    await query(createSchoolTable);

    // Send a success response
    res.status(201).json({
      success: true,
      message: "School table created successfully",
    });
  } catch (error: any) {
    console.log(error);
    res.send(
      error.message || "An error occurred while creating the school table"
    );
  }
};
