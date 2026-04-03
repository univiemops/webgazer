import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import params from './params.mjs';

// Eye landmark indices for MediaPipe FaceMesh (468 landmarks)
// Reference: https://github.com/tensorflow/tfjs-models/blob/master/face-landmarks-detection/mesh_map.jpg
const EYE_INDICES = {
  // Note: "left" and "right" are from the subject's perspective
  leftEyeUpper0: [466, 388, 387, 386, 385, 384, 398],
  leftEyeLower0: [263, 249, 390, 373, 374, 380, 381, 382, 362],
  rightEyeUpper0: [246, 161, 160, 159, 158, 157, 173],
  rightEyeLower0: [33, 7, 163, 144, 145, 153, 154, 155, 133],
};

/**
 * Constructor of TFFaceMesh object
 * @constructor
 * */
const TFFaceMesh = function() {
  this.model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
  this.detector = null;
  this.predictionReady = false;
};

// Global variable for face landmark positions array
TFFaceMesh.prototype.positionsArray = null;

/**
 * Initialize the face detector with local MediaPipe solution files
 * @return {Promise} resolves when detector is ready
 */
TFFaceMesh.prototype.init = async function() {
  if (this.detector) {
    return this.detector;
  }

  const detectorConfig = {
    runtime: 'mediapipe',
    solutionPath: params.faceMeshSolutionPath,
  };

  this.detector = await faceLandmarksDetection.createDetector(this.model, detectorConfig);
  return this.detector;
};

/**
 * Isolates the two patches that correspond to the user's eyes
 * @param  {Object} video - the video element itself
 * @param  {Canvas} imageCanvas - canvas corresponding to the webcam stream
 * @param  {Number} width - of imageCanvas
 * @param  {Number} height - of imageCanvas
 * @return {Object} the two eye-patches, first left, then right eye
 */
TFFaceMesh.prototype.getEyePatches = async function(video, imageCanvas, width, height) {

  if (imageCanvas.width === 0) {
    return null;
  }

  // Initialize detector if not already done
  await this.init();

  // Pass in a video stream to obtain an array of detected faces
  const predictions = await this.detector.estimateFaces(video);

  if (predictions.length == 0){
    return false;
  }

  // MediaPipe runtime returns keypoints as array of {x, y, z, name?} objects
  // Convert to [x, y, z] array format for compatibility with rest of codebase
  const keypoints = predictions[0].keypoints;
  this.positionsArray = keypoints.map(kp => [kp.x, kp.y, kp.z || 0]);

  // Helper function to get landmark coordinates by indices
  const getPointsByIndices = (indices) => {
    return indices.map(idx => [keypoints[idx].x, keypoints[idx].y, keypoints[idx].z || 0]);
  };

  const [leftBBox, rightBBox] = [
    // left (from subject's perspective)
    {
      eyeTopArc: getPointsByIndices(EYE_INDICES.leftEyeUpper0),
      eyeBottomArc: getPointsByIndices(EYE_INDICES.leftEyeLower0)
    },
    // right (from subject's perspective)
    {
      eyeTopArc: getPointsByIndices(EYE_INDICES.rightEyeUpper0),
      eyeBottomArc: getPointsByIndices(EYE_INDICES.rightEyeLower0)
    },
  ].map(({ eyeTopArc, eyeBottomArc }) => {
    const topLeftOrigin = {
      x: Math.round(Math.min(...eyeTopArc.map(v => v[0]))),
      y: Math.round(Math.min(...eyeTopArc.map(v => v[1]))),
    };
    const bottomRightOrigin = {
      x: Math.round(Math.max(...eyeBottomArc.map(v => v[0]))),
      y: Math.round(Math.max(...eyeBottomArc.map(v => v[1]))),
    };

    return {
      origin: topLeftOrigin,
      width: bottomRightOrigin.x - topLeftOrigin.x,
      height: bottomRightOrigin.y - topLeftOrigin.y,
    }
  });
  var leftOriginX = leftBBox.origin.x;
  var leftOriginY = leftBBox.origin.y;
  var leftWidth = leftBBox.width;
  var leftHeight = leftBBox.height;
  var rightOriginX = rightBBox.origin.x;
  var rightOriginY = rightBBox.origin.y;
  var rightWidth = rightBBox.width;
  var rightHeight = rightBBox.height;

  if (leftWidth === 0 || rightWidth === 0){
    console.log('an eye patch had zero width');
    return null;
  }

  if (leftHeight === 0 || rightHeight === 0){
    console.log('an eye patch had zero height');
    return null;
  }

  // Start building object to be returned
  var eyeObjs = {};

  var leftImageData = imageCanvas.getContext('2d', { willReadFrequently: true }).getImageData(leftOriginX, leftOriginY, leftWidth, leftHeight);
  eyeObjs.left = {
    patch: leftImageData,
    imagex: leftOriginX,
    imagey: leftOriginY,
    width: leftWidth,
    height: leftHeight
  };

  var rightImageData = imageCanvas.getContext('2d', { willReadFrequently: true }).getImageData(rightOriginX, rightOriginY, rightWidth, rightHeight);
  eyeObjs.right = {
    patch: rightImageData,
    imagex: rightOriginX,
    imagey: rightOriginY,
    width: rightWidth,
    height: rightHeight
  };

  this.predictionReady = true;

  return eyeObjs;
};

/**
 * Returns the positions array corresponding to the last call to getEyePatches.
 * Requires that getEyePatches() was called previously, else returns null.
 */
TFFaceMesh.prototype.getPositions = function () {
  return this.positionsArray;
}

/**
 * Reset the tracker to default values
 */
TFFaceMesh.prototype.reset = function(){
  console.log( "Unimplemented; Tracking.js has no obvious reset function" );
}

/**
 * Draw TF_FaceMesh_Overlay
 */
TFFaceMesh.prototype.drawFaceOverlay = function(ctx, keypoints){
  // If keypoints is falsy, don't do anything
  if (keypoints) {
    ctx.fillStyle = '#32EEDB';
    ctx.strokeStyle = '#32EEDB';
    ctx.lineWidth = 0.5;

    for (let i = 0; i < keypoints.length; i++) {
      const x = keypoints[i][0];
      const y = keypoints[i][1];

      ctx.beginPath();
      ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/**
 * The TFFaceMesh object name
 * @type {string}
 */
TFFaceMesh.prototype.name = 'TFFaceMesh';

export default TFFaceMesh;
