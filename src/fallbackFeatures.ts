export interface FallbackFeature {
  subCategory: string;
  steps: string[];
}

export const FALLBACK_FEATURES_MAP: Record<string, FallbackFeature[]> = {
  "Deepa AI": [
    {
      subCategory: "How it works?",
      steps: [
        "Open the Deepa AI section by clicking the Brain icon on your main dashboard navigation.",
        "Type your question, thought, or request into the prompt console at the bottom.",
        "Deepa AI processes your input server-side using Google's Gemini models to ensure safety and secrecy.",
        "Read and analyze the returned results, copy insights, or ask follow-up questions in the chat session."
      ]
    },
    {
      subCategory: "Voice Inputs",
      steps: [
        "Tap the microphone icon next to the typing area in the Deepa AI panel.",
        "Speak your prompt clearly into your device microphone.",
        "The system transcribes your voice to text in real-time and submits it automatically to Gemini."
      ]
    }
  ],
  "Keep Notes": [
    {
      subCategory: "Creating Notes",
      steps: [
        "Navigate to the Keep Notes tab. Click the 'New Note' button to initialize a clean editor card.",
        "Add a descriptive title and type your ideas using the full markdown format console.",
        "Organize your thoughts by pinning important lists or assigning custom tags."
      ]
    },
    {
      subCategory: "Searching & Tags",
      steps: [
        "Click on the Notes tag filter bar at the top of the Keep Notes view.",
        "Select any tag (e.g. #ideas, #personal, #work) to instantly filter the list.",
        "Use the search field to query the note contents with sub-second keyword indexing."
      ]
    }
  ],
  "Health": [
    {
      subCategory: "Vitals Tracker",
      steps: [
        "Go to the Health center to visualize your current daily health scores.",
        "Log your daily water intake using the interactive cups controller.",
        "Record your workout sessions and track sleep quality trends over the past week."
      ]
    }
  ],
  "Search": [
    {
      subCategory: "Universal Search",
      steps: [
        "Click the global search query field on the top bar or use the system search shortcut.",
        "Type any query keyword, tag, phone number, contact name, or diary entry title.",
        "The indexed engine instantly fetches matching objects grouped by database collection."
      ]
    }
  ],
  "Tasks": [
    {
      subCategory: "Task Center",
      steps: [
        "Open the Tasks section. Add active checklist items with due dates and priority ranks.",
        "Structure larger projects by adding specific subtasks within individual parent cards.",
        "Organize cards into Active, Pending, or Completed columns to maintain a clean timeline."
      ]
    }
  ],
  "Calendar": [
    {
      subCategory: "Agenda Hub",
      steps: [
        "Tap Calendar. Switch between Monthly, Weekly, and Daily timeline views.",
        "Add dynamic events with exact times, location records, and customizable alerts.",
        "Check automatic synchronization of due tasks directly on your calendar grid."
      ]
    }
  ],
  "Timer": [
    {
      subCategory: "Focus Clock",
      steps: [
        "Select Pomodoro, Stopwatch, or Countdown mode depending on your current productivity objective.",
        "Customize work-break cycles, session counts, and alarm sounds in the configuration panel.",
        "Click Start and lock your focus. Turn on optional background white-noise soundscapes."
      ]
    }
  ],
  "Arena": [
    {
      subCategory: "Accountability",
      steps: [
        "Enter the gamified Accountability Arena to view your leveling progress and current streak multiplier.",
        "Earn experience points (XP) in real-time by checking off habits and finishing active daily tasks.",
        "Maintain your daily activity threshold to prevent your level streak multiplier from resetting."
      ]
    }
  ],
  "Habits": [
    {
      subCategory: "Routine Builder",
      steps: [
        "Navigate to Habits and tap 'Add Habit'. Choose a frequency (daily, weekly, or specific days).",
        "Check off completed habits directly from your dashboard or active schedule grid.",
        "Analyze long-term streak calendars and compliance charts to build permanent positive routines."
      ]
    }
  ],
  "Countdown": [
    {
      subCategory: "Milestones",
      steps: [
        "Go to the Countdown tab. Add important events like travel, exams, or launch targets.",
        "Specify the target date, time, and custom card icon/background color gradient.",
        "View countdown cards updating days, hours, and seconds remaining in real-time."
      ]
    }
  ],
  "Journal": [
    {
      subCategory: "Diary Logs",
      steps: [
        "Click Journal. Tap 'New Entry' to document today's thoughts, experiences, and events.",
        "Select a mood indicator slider representing your overall mental state for the day.",
        "Reflect on monthly mood maps and tag indexes to observe emotional health patterns."
      ]
    }
  ],
  "Contacts": [
    {
      subCategory: "Personal CRM",
      steps: [
        "Open Contacts. Tap 'New Record' to save connection details including phone numbers and relationship tags.",
        "Log details of your recent calls, catch-ups, or emails to maintain active relationships.",
        "Set custom reminders for contact birthdays or upcoming follow-up schedules."
      ]
    }
  ],
  "File Explorer": [
    {
      subCategory: "Storage Vault",
      steps: [
        "Navigate to File Explorer. Tap upload or drag files into your encrypted offline folder.",
        "Organize documents, receipts, screenshots, or voice notes by creating nested folder paths.",
        "Preview files instantly or attach them directly to active notes, task items, or diary entries."
      ]
    }
  ],
  "Finances": [
    {
      subCategory: "Personal Ledger",
      steps: [
        "Go to Finances. Log daily expenses and earnings with transaction categories.",
        "Establish monthly limits across categories like shopping, food, and rent to avoid overspending.",
        "Study savings ratios and historical budget graphs to reach your financial goals faster."
      ]
    }
  ],
  "Analytics": [
    {
      subCategory: "Insights Portal",
      steps: [
        "Open Analytics to aggregate data collected across your tasks, habits, health, and finance trackers.",
        "Examine correlation charts (e.g. how sleep duration impacts task completion rates).",
        "Generate and export summary PDF dashboard reports of your weekly performance metrics."
      ]
    }
  ],
  "Settings": [
    {
      subCategory: "Console Center",
      steps: [
        "Go to Settings. Toggle layouts, order dashboard sections, or customize primary theme accents.",
        "Adjust default targets like daily water ounces, task thresholds, and XP multiplier caps.",
        "Perform manual cloud backups or download full offline database exports for ultimate safety."
      ]
    }
  ]
};
