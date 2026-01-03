import { ChangeEvent, useEffect, useState } from "react";
import { supabase } from "../supabase-client";
import { Session } from "@supabase/supabase-js";

interface Task {
  id: number;
  title: string;
  description: string;
  created_at: string;
  image_url: string | null;
}

function TaskManager({ session }: { session: Session }) {
  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newDescription, setNewDescription] = useState("");
  const [taskImage, setTaskImage] = useState<File | null>(null);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error reading tasks:", error.message);
      return;
    }

    setTasks(data);
  };

  const deleteTask = async (id: number) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) console.error("Error deleting task:", error.message);
  };

  const updateTask = async (id: number) => {
    const { error } = await supabase
      .from("tasks")
      .update({ description: newDescription })
      .eq("id", id);
    if (error) console.error("Error updating task:", error.message);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const filePath = `${file.name}-${Date.now()}`;
    const { error } = await supabase.storage
      .from("tasks-images")
      .upload(filePath, file);
    if (error) {
      console.error("Error uploading image:", error.message);
      return null;
    }

    const { data } = await supabase.storage
      .from("tasks-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    let imageUrl: string | null = null;
    if (taskImage) imageUrl = await uploadImage(taskImage);

    const { error } = await supabase
      .from("tasks")
      .insert({
        title: newTask.title,
        description: newTask.description,
        image_url: imageUrl,
        user_id: session.user.id, // added this line
        email: session.user.email, // added this line
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding task:", error.message);
      return;
    }

    setNewTask({ title: "", description: "" });
    fetchTasks();
  };

//   const handleSubmit = async (e: React.FormEvent) => {
//   e.preventDefault();

//   if (!session?.user) {
//     console.error("No session");
//     return;
//   }

//   if (!newTask.title.trim()) {
//     console.error("Title is required");
//     return;
//   }

//   if (!taskImage) {
//     console.error("Image is required");
//     return;
//   }

//   // 1️⃣ Upload image
//   const fileExt = taskImage.name.split(".").pop();
//   const filePath = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`;

//   const { error: uploadError } = await supabase.storage
//     .from("tasks-images")
//     .upload(filePath, taskImage);

//   if (uploadError) {
//     console.error("Upload error:", uploadError.message);
//     return;
//   }

//   // 2️⃣ Get public URL
//   const { data } = supabase.storage
//     .from("tasks-images")
//     .getPublicUrl(filePath);

//   const imageUrl = data.publicUrl;

//   // 3️⃣ Insert task into DB
//   const { error: insertError } = await supabase
//     .from("tasks")
//     .insert({
//       title: newTask.title,
//       description: newTask.description,
//       image_url: imageUrl,
//       user_id: session.user.id,
//       email: session.user.email,
//     });

//   if (insertError) {
//     console.error("DB error:", insertError.message);
//     return;
//   }

//   // 4️⃣ Reset
//   setNewTask({ title: "", description: "" });
//   setTaskImage(null);
//   fetchTasks();
// };


  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setTaskImage(e.target.files[0]);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    const subscription = supabase
      .channel("tasks-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          const newTask = payload.new as Task;
          // For INSERT: add task
          if (payload.eventType === "INSERT") setTasks((prev) => [...prev, newTask]);
          // For UPDATE: update task
          if (payload.eventType === "UPDATE")
            setTasks((prev) =>
              prev.map((t) => (t.id === newTask.id ? newTask : t))
            );
          // For DELETE: remove task
          if (payload.eventType === "DELETE")
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "1rem" }}>
      <h2>Task Manager CRUD</h2>

      {/* Add Task Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Task Title"
          value={newTask.title}
          onChange={(e) =>
            setNewTask((prev) => ({ ...prev, title: e.target.value }))
          }
          style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem" }}
        />
        <textarea
          placeholder="Task Description"
          value={newTask.description}
          onChange={(e) =>
            setNewTask((prev) => ({ ...prev, description: e.target.value }))
          }
          style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem" }}
        />

        <input type="file" accept="image/*" onChange={handleFileChange} />

        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Add Task
        </button>
      </form>

      {/* Tasks List */}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {tasks.map((task) => (
          <li
            key={task.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "1rem",
              marginBottom: "0.5rem",
            }}
          >
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            {task.image_url && <img src={task.image_url} style={{ height: 70 }} />}
            <div>
              <textarea
                placeholder="Updated description..."
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <button
                style={{ padding: "0.5rem 1rem", marginRight: "0.5rem" }}
                onClick={() => updateTask(task.id)}
              >
                Edit
              </button>
              <button
                style={{ padding: "0.5rem 1rem" }}
                onClick={() => deleteTask(task.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaskManager;
