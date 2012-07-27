#!/usr/bin/env python
import sys
import time
import re
#get full file name
fileName = sys.argv[1]
outputFileName = sys.argv[2]
jsFile = sys.argv[3]
displayType = sys.argv[4]
baseNamespace =  sys.argv[5]
baseValue =  sys.argv[6]
#get filePath
if fileName.rfind('\\')>-1:
    filePathArray = fileName.split('\\');
    pathChar = '\\';
else:
    filePathArray = fileName.split(r'/');
    pathChar = r'/';
filePathArray.pop(-1);
filePath = pathChar.join(filePathArray) + pathChar;
result=[]
f = open(fileName);

lineStatus = 0;
while True:
        line = f.readline();  
        if not line:
                break;
        line = line.replace(r'$jsFile', jsFile);
        line = line.replace(r'$displayType', displayType);
        line = line.replace(r'$baseNamespace', baseNamespace);
        line = line.replace(r'$baseValue', baseValue);
        #if ignore the code by delete command: start
        deleteStartPattern = re.compile(r".*//\s?@delete \{", re.I);
        deleteEndPattern = re.compile(r".*//\s?@delete \}", re.I);
        
        if jsFile == "param":
            deleteStartMatch = deleteStartPattern.match(line);
            deleteEndMatch = deleteEndPattern.match(line);
            if deleteStartMatch:
                lineStatus = 1;
            if deleteEndMatch:
                lineStatus = 0;        
            if lineStatus == 1: 
                continue;
        #if ignore the code by delete command: end
        
        pattern = re.compile(r"///@import ([0-9a-zA-Z\.]+)", re.I);
        match = pattern.match(line);
        
        if match:                
                importFileName = match.group(1);
                subFile = open(filePath+importFileName+r".js");
                subLineStatus = 0;
                result.append("\n");
                while True:
                    subFileLine = subFile.readline();
                    if not subFileLine:
                            break;
                    #if ignore the code by delete command: start
                    if jsFile == "param":
                        deleteStartMatchSub = deleteStartPattern.match(subFileLine);
                        deleteEndMatchSub = deleteEndPattern.match(subFileLine);
                        if deleteStartMatchSub:
                            print("start sub");
                            subLineStatus = 1;
                        if deleteEndMatchSub:
                            print("end sub");
                            subLineStatus = 0;        
                        if subLineStatus == 1: 
                            continue;
                    #if ignore the code by delete command: end
                    
                    subFileLine = subFileLine.replace(r'$jsFile', jsFile);
                    subFileLine = subFileLine.replace(r'$displayType', displayType);
                    subFileLine = subFileLine.replace(r'$baseNamespace', baseNamespace);
                    subFileLine = subFileLine.replace(r'$baseValue', baseValue);
                    result.append(subFileLine);
        else:
                result.append(line);
                
f.close()
fw = open(outputFileName, "w");
fw.writelines(result);
fw.close();
