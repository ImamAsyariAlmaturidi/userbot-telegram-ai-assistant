import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    messageId?: string;
    chatId?: string;
    [key: string]: any;
  };
}

export interface IConversation extends Document {
  sessionId: string; // Format: ownerUserId_senderId (e.g., "7997101965_8536598335")
  ownerUserId: string; // User ID yang punya userbot
  senderId: string; // User ID yang mengirim pesan
  messages: IConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  // Index fields for faster queries
  ownerUserId_index: string;
  senderId_index: string;
}

const ConversationMessageSchema = new Schema<IConversationMessage>(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ownerUserId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    messages: {
      type: [ConversationMessageSchema],
      default: [],
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ownerUserId_index: {
      type: String,
      index: true,
    },
    senderId_index: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "conversations",
  }
);

// Compound index for faster queries
ConversationSchema.index({ ownerUserId: 1, senderId: 1 });
ConversationSchema.index({ sessionId: 1 });
ConversationSchema.index({ lastActivityAt: -1 });

// TTL index to auto-delete old conversations (optional - 90 days)
// Uncomment if you want auto-cleanup
// ConversationSchema.index({ lastActivityAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Pre-save hook to update index fields
ConversationSchema.pre("save", function (next) {
  const doc = this as any;
  if (doc.isNew || doc.isModified("ownerUserId")) {
    doc.ownerUserId_index = doc.ownerUserId;
  }
  if (doc.isNew || doc.isModified("senderId")) {
    doc.senderId_index = doc.senderId;
  }
  doc.lastActivityAt = new Date();
  next();
});

// Method to add message
ConversationSchema.methods.addMessage = function (
  role: "user" | "assistant" | "system",
  content: string,
  metadata?: any
) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata: metadata || {},
  });
  this.lastActivityAt = new Date();
  return this.save();
};

// Method to get recent messages (last N messages)
ConversationSchema.methods.getRecentMessages = function (limit: number = 20) {
  return this.messages.slice(-limit);
};

// Static method to find or create conversation
ConversationSchema.statics.findOrCreate = async function (
  ownerUserId: string,
  senderId: string
) {
  const sessionId = `${ownerUserId}_${senderId}`;
  let conversation = await this.findOne({ sessionId });

  if (!conversation) {
    conversation = await this.create({
      sessionId,
      ownerUserId,
      senderId,
      messages: [],
    });
  }

  return conversation;
};

// Export model
let Conversation: Model<IConversation>;

try {
  Conversation = mongoose.model<IConversation>("Conversation");
} catch {
  Conversation = mongoose.model<IConversation>(
    "Conversation",
    ConversationSchema
  );
}

export default Conversation;
