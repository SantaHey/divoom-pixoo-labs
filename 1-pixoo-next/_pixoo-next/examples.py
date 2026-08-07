from pixoo import Channel, ImageResampleMode, Pixoo, Font, ItemType

'''
Create a connection to a Pixoo

First argument is its IP address (required)
The second argument is the display size (optional, default 64)
The third argument is the model name for the display (optional, default "PIXOO64"). It currently supports three models ('PIXOO64', 'PIXOO16', and 'TIMEGATE').
The fourth argument is the 'debug mode' (optional, default False), which enables logging of important actions
'''
pixoo = Pixoo('192.168.50.214', 64, "PIXOO64", True)

# The following are all 'drawing' methods.
# Afterwards, be sure to call `pixoo.push()` to send the internal buffer to the connected display
'''
Fill the display with the given color
'''
pixoo.fill((255, 0, 68))
# or
pixoo.fill_rgb(255, 0, 68)

'''
Draw a filled rectangle from top-left to bottom-right
'''
pixoo.draw_filled_rectangle((1, 1), (62, 62), (255, 99, 0))
# or
pixoo.draw_filled_rectangle_from_top_left_to_bottom_right_rgb(1, 1, 62, 62, 255, 99, 0)

'''
Draw a pixel at a location to a given color (starting top left)
'''
pixoo.draw_pixel((0, 0), (255, 255, 255))  # Sets the top left pixel to full white
# or
pixoo.draw_pixel_at_location_rgb(0, 0, 255, 255, 255)

'''
Draw a pixel at the given index (each pixel has its own index based on the position on the display, starting top left
'''
pixoo.draw_pixel_at_index(127, (255, 255, 255))  # Set the pixel at (63, 1) to full white
# or
pixoo.draw_pixel_at_index_rgb(127, 255, 255, 255)

'''
Draw a string of text at a given position with a given color.
This will draw text to the buffer (so call `push()`) and it's not the same as `send_text` (and therefore less buggy)

First argument is the text string (required)
Second argument is a xy position of the text (as a tuple; optional; default is (0, 0))
Third argument is the RGB color of the text (as a tuple; optional; default is (255, 255, 255))
Fourth argument is the width of the text box. The default is 0 which essentially means infinite width.
Fifth argument is the font for the text (uses a Font class). The default is the Tom Thumb font.
Sixth argument is the alignment of the text within the text box ('L', 'C', or 'R'; default is 'L').
'''
pixoo.draw_text('Hello there..', (0, 0), (0, 255, 0), 64, Font.FONT_TOM_THUMB, 'L')
pixoo.draw_text('GENERAL KENOBI', (0, 6), (255, 0, 0), 64, Font.FONT_TOM_THUMB, 'L')
# or
pixoo.draw_text_at_location_rgb('Neat', 0, 6, 255, 255, 0, 64, Font.FONT_TOM_THUMB, 'L')

'''
Load and add an image to the buffer.

If the image is too large (e.g. larger than 64x64 pixels) it'll be resized to fit the display, keeping aspect ratio
The image can be resized fit for pixel art or smooth: ImageResampleMode.PIXEL_ART or ImageResampleMode.SMOOTH

If a location is provided, the image might be cut off the sides of the display based on the location.
Locations can be larger than the screen size (though the image would be off-screen) or contain coordinates < 0.
'''
pixoo.draw_image('tiny.png')  # Adds image at path 'tiny.png' at default location (0, 0)
# or
pixoo.draw_image('tiny.png', (12, 16))  # Adds image at path 'tiny.png' at location (12, 16)
# or
pixoo.draw_image('tiny.png', (-10, -14), ImageResampleMode.SMOOTH)  # Resizes the image but uses anti-aliasing
# or
pixoo.draw_image_at_location('tiny.png', 10, 10)  # Alternative way of providing coordinates

'''
Draw a line from point start to stop with a given color
'''
pixoo.draw_line((10, 12), (32, 54), (90, 12, 255))
# or
pixoo.draw_line_from_start_to_stop_rgb(10, 12, 32, 54, 90, 12, 255)

'''
The save_frame method saves the current buffer to the frame of the GIF and allows you to modify the buffer for the next frame in the GIF.
This method supports one parameter which is the index of the frame (0 is first).
'''
pixoo.save_frame()

'''
The clear_frames method clears all frames from the buffer.
'''
#pixoo.clear_frames()

'''
The push method pushes the buffer to the screen (also saves the current frame if there are currently none in the buffer), needs to be called after you're done with all drawing-type methods
This method accepts one parameter: the speed parameter which indicates the time (in ms) to display each frame in the animation. Default is 500 ms.
For TimeGate users, this method accepts another parameter: the lcd_index parameter that determines which one of the five lcds to send the item to (optional; default is 0 which is the far left screen; must be between 0 and 4)
'''
pixoo.push(500)

# The following are all 'device' methods.
'''
Set the current Channel on the display

Use the Channel enum from the library to help a bit. Available channels are: FACES, CLOUD, VISUALIZER, and CUSTOM
'''
pixoo.set_channel(Channel.FACES)

'''
After setting the channel to FACES (ClockFACES I assume?) you can select a clock like this

The clock id is a number that corresponds to the installed clocks on your device
'''
pixoo.set_clock(0)

'''
Turn the screen on/off

The screen still renders internally when off, but nothing will be shown on the display
'''
pixoo.set_screen_off()
pixoo.set_screen_on()
pixoo.set_screen(False)

'''
After setting the channel to VISUALIZER you can select a audio visualizer like this

The visualizer id is a number that corresponds to the installed visualizers on your device
'''
pixoo.set_visualizer(0)

'''
Set the brightness of the display

The brightness needs to be an integer between inclusive 0 and 100
'''
pixoo.set_brightness(100)

'''
Send text to the display using (currently seemingly in alpha) text functionality
def send_text(self, text, xy=(0, 0), color=(255, 255, 255), identifier=1, font=2, width=64,
              movement_speed=0,
              direction=TextScrollDirection.RIGHT):
The first argument is the string to be displayed (required)
The second argument is the position to place the string (optional, default (0, 0))
the third argument is the color of the text (optional, default (255, 255, 255))
The fourth is the text identifier. Use this to update existing text on the display (optional, default 1, has to be
between 0 and 20)
The fifth is the font identifier (optional, default 2, has to be between 0 and 7 but support seems limited for some fonts)
The sixth argument is the width of the "textbox" (optional, default 64)
The seventh argument is the movement speed of the text in case it doesn't fit the "textbox" (optional, default 0)
    **NOTE:** Currently there seems to be no way to stop the movement
The eight and final argument is the movement direction of the text (optional, default TextScrollDirection.LEFT)
    **NOTE:** Currently TextScrollDirection.RIGHT seems broken on the display

This method will return an error if done to the Pixoo 16 as it does not support this functionality.

NOTE: Currently this is **not** a drawing method, so it'll add the text over whatever is already on screen
'''
# Send text after pushing all your other data, because it'll otherwise be overwritten if it's not animated
pixoo.send_text('Hello there', (0, 0), (10, 255, 0), 1, 6)
pixoo.send_text('GENERAL KENOBI', (0, 15), (255, 0, 0), 2, 6)

'''
Add a text item to the item buffer. Unlike send_text, this method is suited for items that update periodically such as the time, date, weather, and temperature. 
First argument is the text string (optional, default is None)
Second argument is the position to place the item (optional; default is (0, 0))
Third argument is the color of the text (optional; default is (255, 255, 255))
Fourth argument is the text identifier. Use this to update existing items (optional; default is 1; must be between 0 and 40 inclusive)
Fifth argument is the item type. Use this to set whether the item should display minutes, seconds, year, etc. (optional; default is 22 which indicates that it is a text item; must be between 1 and 23)
Sixth argument is the scroll direction of the text (optional; default TextScrollDirection.LEFT)
Seventh argument is the font identifier. Unlike send_text, add_item seems to support a lot more fonts. Refer to the font dictionary for more information (optional; default is 2).
Eighth argument is the width of the textbox (optional; default is 64)
Ninth argument is the height of the textbox (optional; default is 16)
Tenth argument is the speed of the scrolling text in case the string overflows (optional; default is 100)
Eleventh argument is how often the text string should update in seconds (optional; default is 0 which indicates that the item should use default settings)
Twelfth argument is the alignment of the text within the text box (optional; default is 'L'; must be 'L', 'C', or 'R')
'''
# Add a text item to the buffer that displays the minutes
pixoo.add_item(None, (0, 0), (255, 255, 255), 3, ItemType.MINUTES, TextScrollDirection.LEFT, 2, 64, 16, 100, None, 'L')

'''
Push the items in the item buffer to the display. The buffer will be cleared after this method is called.
For TimeGate users, this method accepts one parameter: the lcd_index parameter that determines which one of the five lcds to send the item to (optional; default is 0; must be between 0 and 4)

This method will return an error if done to the Pixoo 16 as it does not support this functionality.
NOTE: Currently this is **not** a drawing method, so it'll add the text over whatever is already on screen
'''
pixoo.send_items()

'''
Clear all text and text items that were created using the send_text method or the send_items method.
'''
pixoo.clear_text()


'''
DISPLAY TYPES

1 - Seconds (SS)
2 - Minutes (MM)
3 - Hour (HH)
4 - AM/PM
5 - HH:MM (12-hr)
6 - HH:MM:SS (12-hr)

7 - Year (YYYY)
8 - Day (DD)
9 - Month (MM)
10 - MM-YYYY
11 - MMM-DD
12 - DD-MMM-YYYY
13 - Weekday (Two letters; e.g. Su/Mo/Tu/We/Th/Fr/Sa)
14 - Weekday (Three letters; eg. Sun/Mon/Tue/Wed/Thu/Fri/Sat)
15 - Weekday (Full letters)
16 - Month (MMM)
17 - Temperature
18 - High Temperature
19 - Low Temperature
20 - Weather forecast
21 - Noise value
22 - Text string
23 - URL request string. The HTTP reponse must be a JSON encode with a "DispData" string.
'''