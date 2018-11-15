pragma solidity 0.4.25;

import "../libs/LibStaticCall.sol";


contract TestCaller is LibStaticCall {

  function execStaticCall(
    address to,
    bytes4 selector,
    bytes calldata
  )
    public
    view
    returns (bytes)
  {
    bytes memory data = abi.encodePacked(selector, calldata);
    return staticcall_as_bytes(to, data);
  }

  function execStaticCallBool(
    address to,
    bytes4 selector,
    bytes calldata
  )
    public
    view
    returns (bool)
  {
    bytes memory data = abi.encodePacked(selector, calldata);
    return staticcall_as_bool(to, data);
  }

}
