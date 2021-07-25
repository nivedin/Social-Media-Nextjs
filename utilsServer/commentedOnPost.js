const UserModel = require("../models/UserModel");
const PostModel = require("../models/PostModel");
const uuid = require("uuid").v4;
const {
  newCommentNotification,
  removeCommentNotification,
} = require("./notificationActions");

const commentedOnPost = async (postId, userId, text) => {
  try {
    // const user = UserModel.getUserById(userId);
    //console.log("test", postId, userId, text);

    if (text.length < 1)
      return { error: "Comment should be atleast 1 character" };

    const post = await PostModel.findById(postId);

    if (!post) return { error: "No Post Found !!" };

    // console.log(post);

    const newComment = {
      _id: uuid(),
      text,
      user: userId,
      date: Date.now(),
    };

    await post.comments.unshift(newComment);
    await post.save();

    if (post.user.toString() !== userId) {
      await newCommentNotification(
        postId,
        newComment._id,
        userId,
        post.user.toString(),
        newComment.text
      );
    }

    const user = await UserModel.findById(userId);

    const { name, profilePicUrl, username } = user;

    return {
      success: true,
      commentId: newComment._id,
      name,
      profilePicUrl,
      username,
      postByUserId: post.user.toString(),
    };
  } catch (error) {
    return { error: "Server Error" };
  }
};

module.exports = { commentedOnPost };
