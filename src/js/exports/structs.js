import * as functions from "./functions.js";

const postFilter = functions.makeStruct("page size author onlyMyCommunities readingTimeMin readingTimeMax tags sorting"),
    communityPostFilter = functions.makeStruct("page size tags sorting"),
    loginDto = functions.makeStruct("email password"),
    registerDto = functions.makeStruct("fullName birthDate gender phoneNumber email password"),
    postDto = functions.makeStruct("title description readingTime image addressId tags"),
    profileDto = functions.makeStruct("fullName email birthDate gender phoneNumber");

export { postFilter, loginDto, registerDto, postDto, profileDto, communityPostFilter };
