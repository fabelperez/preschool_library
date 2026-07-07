import { createPublicClient } from "@/lib/supabase/publicClient";

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();

    const {
      requestText,
      roomColor,
      requestedBy,
      email,
    } = body;

    // Validate required fields
    if (!requestText || requestText.trim() === "") {
      return Response.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createPublicClient();

    // Insert request into database
    const { data, error } = await supabase
      .from("library_requests")
      .insert([
        {
          request_text: requestText,
          room_color: roomColor,
          requested_by: requestedBy,
          email: email,
        },
      ])
      .select();

    // Handle insert errors
    if (error) {
      console.error("SUPABASE INSERT ERROR:", error);

      return Response.json(
        {
          error: error.message,
          details: error.details,
        },
        { status: 500 }
      );
    }

    // Debug success output
    console.log("INSERT SUCCESS:", data);

    return Response.json({
      ok: true,
      data,
    });

  } catch (error) {
    console.error("ROUTE ERROR:", error);

    return Response.json(
      {
        error: "Failed to save request",
      },
      { status: 500 }
    );
  }
}
