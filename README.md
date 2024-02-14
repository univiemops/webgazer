# webgazer for joptim-exp

Differences to the original webgazer repo
- Stores `deviceId` of the selected webcam in the webgazer object to prevent the browser from using another webcam in the same session.
- Modified `gazeDot` (transparent, larger).
- z-index of `gazeDot` and calibration points (`.Calibration`) adapted to make calibration points clickable when the `gazeDot` is in the same position. 
